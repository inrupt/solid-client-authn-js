// Copyright Inrupt Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
// Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

import { jest, it, describe, expect, afterEach } from "@jest/globals";
import { generateDpopKeyPair } from "@inrupt/solid-client-authn-core";
import { clientCredentialsGrant } from "openid-client";
import { decodeProtectedHeader } from "jose";
import {
  buildClientConfiguration,
  buildDpopHandle,
} from "./clientConfiguration";
import { mockIssuerConfig } from "./__mocks__/IssuerConfigFetcher";

// Camelcase identifiers are required in the OIDC specification.
/* eslint-disable camelcase*/

const mockTokenResponse = () =>
  new Response(
    JSON.stringify({ access_token: "some token", token_type: "Bearer" }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );

const mockFetch = () =>
  jest
    .spyOn(globalThis, "fetch")
    .mockImplementation(async () => mockTokenResponse());

const getTokenRequest = (fetchSpy: ReturnType<typeof mockFetch>) => {
  const [url, init] = fetchSpy.mock.calls[0];
  return {
    url: url.toString(),
    headers: new Headers(init?.headers),
    body: new URLSearchParams(init?.body as URLSearchParams),
  };
};

describe("buildClientConfiguration", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("sets the client ID and expected ID Token signing algorithm", () => {
    const config = buildClientConfiguration(mockIssuerConfig({}), {
      clientId: "some client",
      idTokenSignedResponseAlg: "ES256",
    });
    expect(config.clientMetadata()).toMatchObject({
      client_id: "some client",
      id_token_signed_response_alg: "ES256",
    });
    expect(config.serverMetadata().issuer).toBe("https://my.idp/");
  });

  it("uses client_secret_basic authentication if the client has a secret", async () => {
    const fetchSpy = mockFetch();
    const config = buildClientConfiguration(mockIssuerConfig({}), {
      clientId: "someClient",
      clientSecret: "someSecret",
    });
    await clientCredentialsGrant(config);
    const request = getTokenRequest(fetchSpy);
    expect(request.url).toBe("https://my.idp/token");
    expect(request.headers.get("Authorization")).toBe(
      `Basic ${Buffer.from("someClient:someSecret").toString("base64")}`,
    );
    expect(request.body.get("client_id")).toBeNull();
  });

  it("uses no client authentication if the client has no secret", async () => {
    const fetchSpy = mockFetch();
    const config = buildClientConfiguration(mockIssuerConfig({}), {
      clientId: "some client",
    });
    await clientCredentialsGrant(config);
    const request = getTokenRequest(fetchSpy);
    expect(request.headers.get("Authorization")).toBeNull();
    expect(request.body.get("client_id")).toBe("some client");
  });

  it("allows plain HTTP requests for loopback issuers", async () => {
    const fetchSpy = mockFetch();
    const config = buildClientConfiguration(
      mockIssuerConfig({
        issuer: "http://localhost:3000/",
        tokenEndpoint: "http://localhost:3000/token",
      }),
      { clientId: "some client" },
    );
    await expect(clientCredentialsGrant(config)).resolves.toBeDefined();
    expect(getTokenRequest(fetchSpy).url).toBe("http://localhost:3000/token");
  });

  it("rejects plain HTTP requests for non-loopback issuers", async () => {
    const fetchSpy = mockFetch();
    const config = buildClientConfiguration(
      mockIssuerConfig({
        issuer: "http://my.idp/",
        tokenEndpoint: "http://my.idp/token",
      }),
      { clientId: "some client" },
    );
    await expect(clientCredentialsGrant(config)).rejects.toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("buildDpopHandle", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns undefined if no key is provided", async () => {
    const config = buildClientConfiguration(mockIssuerConfig({}), {
      clientId: "some client",
    });
    await expect(buildDpopHandle(config, undefined)).resolves.toBeUndefined();
  });

  it("builds a handle that signs DPoP proofs with the provided key pair", async () => {
    const fetchSpy = mockFetch();
    const config = buildClientConfiguration(mockIssuerConfig({}), {
      clientId: "some client",
    });
    const dpopKey = await generateDpopKeyPair();
    await clientCredentialsGrant(config, undefined, {
      DPoP: await buildDpopHandle(config, dpopKey),
    });
    const proof = getTokenRequest(fetchSpy).headers.get("DPoP");
    expect(proof).not.toBeNull();
    const header = decodeProtectedHeader(proof as string);
    expect(header.typ).toBe("dpop+jwt");
    expect(header.alg).toBe("ES256");
    expect(header.jwk).toMatchObject({
      kty: dpopKey.publicKey.kty,
      crv: dpopKey.publicKey.crv,
      x: dpopKey.publicKey.x,
      y: dpopKey.publicKey.y,
    });
  });

  it("defaults to ES256 if the public JWK has no alg", async () => {
    const fetchSpy = mockFetch();
    const config = buildClientConfiguration(mockIssuerConfig({}), {
      clientId: "some client",
    });
    const dpopKey = await generateDpopKeyPair();
    delete dpopKey.publicKey.alg;
    await clientCredentialsGrant(config, undefined, {
      DPoP: await buildDpopHandle(config, dpopKey),
    });
    const proof = getTokenRequest(fetchSpy).headers.get("DPoP");
    expect(decodeProtectedHeader(proof as string).alg).toBe("ES256");
  });
});
