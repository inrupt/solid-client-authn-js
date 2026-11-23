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
import { clientCredentialsGrant } from "openid-client";
import { decodeProtectedHeader } from "jose";
import {
  generateDpopKeyPair,
  OidcProviderError,
} from "@inrupt/solid-client-authn-core";
import {
  buildClientConfiguration,
  buildDpopHandle,
  fetchWithRedirectUri,
  toOidcProviderError,
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

describe("fetchWithRedirectUri", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const requestOptions = (body: URLSearchParams | string) => ({
    body,
    headers: {},
    method: "POST",
    redirect: "manual" as const,
  });

  it("sets the redirect_uri of authorization code token requests", async () => {
    const fetchSpy = mockFetch();
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      redirect_uri: "https://my.app/redirect",
    });
    await fetchWithRedirectUri("https://my.app/redirect?some=param")(
      "https://my.idp/token",
      requestOptions(body),
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://my.idp/token",
      expect.objectContaining({ body }),
    );
    expect(body.get("redirect_uri")).toBe("https://my.app/redirect?some=param");
  });

  it("does not modify other requests", async () => {
    const fetchSpy = mockFetch();
    const body = new URLSearchParams({ grant_type: "refresh_token" });
    await fetchWithRedirectUri("https://my.app/redirect?some=param")(
      "https://my.idp/token",
      requestOptions(body),
    );
    expect(body.get("redirect_uri")).toBeNull();
    await fetchWithRedirectUri("https://my.app/redirect?some=param")(
      "https://my.idp/token",
      requestOptions("some body"),
    );
    expect(fetchSpy).toHaveBeenLastCalledWith(
      "https://my.idp/token",
      expect.objectContaining({ body: "some body" }),
    );
  });
});

describe("toOidcProviderError", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Gets the error thrown by openid-client for the given token endpoint response.
  const getOpenidClientError = async (response: Response): Promise<unknown> => {
    jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(response);
    const config = buildClientConfiguration(mockIssuerConfig({}), {
      clientId: "someClient",
      clientSecret: "someSecret",
    });
    return clientCredentialsGrant(config).catch((e: unknown) => e);
  };

  const errorResponse = (
    body: Record<string, string>,
    status = 400,
    headers: Record<string, string> = {},
  ) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...headers },
    });

  it("converts an error in the response body", async () => {
    const error = toOidcProviderError(
      await getOpenidClientError(
        errorResponse({
          error: "invalid_grant",
          error_description: "Some description",
          error_uri: "https://my.idp/errors/invalid_grant",
        }),
      ),
    );
    expect(error).toBeInstanceOf(OidcProviderError);
    expect(error).toMatchObject({
      message:
        "Token endpoint returned error [invalid_grant]: Some description (see https://my.idp/errors/invalid_grant)",
      error: "invalid_grant",
      errorDescription: "Some description",
    });
  });

  it("converts an error in the response body without description", async () => {
    const error = toOidcProviderError(
      await getOpenidClientError(errorResponse({ error: "invalid_grant" })),
    );
    expect(error).toBeInstanceOf(OidcProviderError);
    expect(error).toMatchObject({
      message: "Token endpoint returned error [invalid_grant]",
      error: "invalid_grant",
      errorDescription: undefined,
    });
  });

  it("converts an error in a WWW-Authenticate challenge", async () => {
    const error = toOidcProviderError(
      await getOpenidClientError(
        errorResponse({ error: "invalid_client" }, 401, {
          "WWW-Authenticate":
            'Basic realm="my.idp", error="invalid_client", error_description="Unknown client"',
        }),
      ),
    );
    expect(error).toBeInstanceOf(OidcProviderError);
    expect(error).toMatchObject({
      message: "Token endpoint returned error [invalid_client]: Unknown client",
      error: "invalid_client",
      errorDescription: "Unknown client",
    });
  });

  it("returns a WWW-Authenticate challenge without error as is", async () => {
    const original = await getOpenidClientError(
      errorResponse({}, 401, { "WWW-Authenticate": 'Basic realm="my.idp"' }),
    );
    expect(toOidcProviderError(original)).toBe(original);
  });

  it("returns other errors as is", () => {
    const original = new Error("Some error");
    expect(toOidcProviderError(original)).toBe(original);
  });
});
