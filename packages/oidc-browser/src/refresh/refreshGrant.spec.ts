/*
 * Copyright 2022 Inrupt Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { IClient } from "@inrupt/solid-client-authn-core";
import { jest, it, describe, expect } from "@jest/globals";
import { jwtVerify, importJWK } from "jose";
import {
  mockBearerTokens,
  mockClient,
  mockDpopTokens,
  mockFetch,
  mockIdToken,
  mockIssuer,
  mockKeyBoundToken,
  mockKeyPair,
  mockWebId,
} from "../__mocks__/issuer.mocks";
import { refresh } from "./refreshGrant";

jest.mock("@inrupt/solid-client-authn-core", () => {
  const actualCoreModule = jest.requireActual(
    "@inrupt/solid-client-authn-core"
  ) as any;
  return {
    ...actualCoreModule,
    // This works around the network lookup to the JWKS in order to validate the ID token.
    getWebidFromTokenPayload: jest.fn(() =>
      Promise.resolve("https://my.webid/")
    ),
  };
});

describe("refreshGrant", () => {
  it("uses basic auth if a client secret is available", async () => {
    const myFetch = mockFetch(JSON.stringify(mockBearerTokens()), 200);
    const client = mockClient();
    client.clientSecret = "some secret";
    await refresh("some refresh token", mockIssuer(), client);
    expect(myFetch.mock.calls[0][0]).toBe(
      mockIssuer().tokenEndpoint.toString()
    );
    const headers = myFetch.mock.calls[0][1]?.headers as Record<string, string>;
    // c29tZSBjbGllbnQ6c29tZSBzZWNyZXQ= is 'some client:some secret' encoded in base 64
    expect(headers.Authorization).toBe(
      "Basic c29tZSBjbGllbnQ6c29tZSBzZWNyZXQ="
    );
  });

  it("include the client id in the body if it is an IRI and no client secret is available", async () => {
    const myFetch = mockFetch(JSON.stringify(mockBearerTokens()), 200);
    const client = mockClient("https://client.identifier");

    await refresh("some refresh token", mockIssuer(), client);
    expect(myFetch.mock.calls[0][0]).toBe(
      mockIssuer().tokenEndpoint.toString()
    );
    // The basic auth scheme should not have been used
    const headers = myFetch.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();

    const body = myFetch.mock.calls[0][1]?.body as BodyInit;
    expect(body.toString()).toContain(
      "client_id=https%3A%2F%2Fclient.identifier"
    );
  });

  it("does not include a non-IRI client ID in the body", async () => {
    const myFetch = mockFetch(JSON.stringify(mockBearerTokens()), 200);
    const client = mockClient("some non-IRI client id");

    await refresh("some refresh token", mockIssuer(), client);
    const mockedFetchCall = myFetch.mock.calls[0];
    expect(mockedFetchCall[0]).toBe(mockIssuer().tokenEndpoint.toString());
    // The basic auth scheme should not have been used
    const headers = mockedFetchCall[1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();

    const body = mockedFetchCall[1]?.body as BodyInit;
    expect(body.toString()).not.toContain("client_id=some+non-IRI+client+id");
  });

  it("includes a DPoP proof if a DPoP key is provided", async () => {
    const myFetch = mockFetch(JSON.stringify(mockDpopTokens()), 200);
    const client = mockClient();
    const keyPair = await mockKeyPair();
    await refresh("some refresh token", mockIssuer(), client, keyPair);
    expect(myFetch.mock.calls[0][0]).toBe(
      mockIssuer().tokenEndpoint.toString()
    );
    const headers = myFetch.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.DPoP).toBeDefined();
    const dpopHeader = headers.DPoP;
    const dpopProof = await jwtVerify(
      dpopHeader,
      await importJWK(keyPair.publicKey)
    );
    expect(dpopProof.payload.htu).toBe(mockIssuer().tokenEndpoint.toString());
  });

  it("throws if the client identifier is undefined", async () => {
    await expect(
      refresh("some refresh token", mockIssuer(), {
        clientId: undefined,
      } as unknown as IClient)
    ).rejects.toThrow(
      "No client ID available when trying to refresh the access token"
    );
  });

  it("throws if the token endpoint returns an unexpected data format (i.e. not JSON)", async () => {
    mockFetch("Some non-JSON data", 200);
    const client = mockClient();
    await expect(
      refresh("some refresh token", mockIssuer(), client)
    ).rejects.toThrow(
      `The token endpoint of issuer ${
        mockIssuer().issuer
      } returned a malformed response.`
    );
  });

  it("POSTs an URL-encoded form with the appropriate grant type", async () => {
    const myFetch = mockFetch(JSON.stringify(mockBearerTokens()), 200);
    await refresh("some refresh token", mockIssuer(), mockClient());
    const requestInit = myFetch.mock.calls[0][1];
    expect(requestInit?.method).toBe("POST");
    expect(
      (requestInit?.headers as Record<string, string>)["Content-Type"]
    ).toBe("application/x-www-form-urlencoded");
    const body = requestInit?.body;
    const searchableBody = new URLSearchParams(body?.toString());
    expect(searchableBody.get("grant_type")).toBe("refresh_token");
  });

  it("sends the refresh to the token endpoint, and requests a new refresh token and id token", async () => {
    const myFetch = mockFetch(JSON.stringify(mockBearerTokens()), 200);
    await refresh("some refresh token", mockIssuer(), mockClient());
    const body = myFetch.mock.calls[0][1]?.body;
    const searchableBody = new URLSearchParams(body?.toString());
    expect(searchableBody.get("refresh_token")).toBe("some refresh token");
    expect(searchableBody.get("scope")).toContain("offline_access");
    expect(searchableBody.get("scope")).toContain("openid");
  });

  it("throws if the token endpoint does not return an access token", async () => {
    mockFetch(
      JSON.stringify({
        ...mockBearerTokens(),
        access_token: undefined,
      }),
      200
    );
    await expect(
      refresh("some refresh token", mockIssuer(), mockClient())
    ).rejects.toThrow("access_token");
  });

  it("throws if the token endpoint does not return an ID token", async () => {
    mockFetch(
      JSON.stringify({
        ...mockBearerTokens(),
        id_token: undefined,
      }),
      200
    );
    await expect(
      refresh("some refresh token", mockIssuer(), mockClient())
    ).rejects.toThrow("id_token");
  });

  it("throws if the token endpoint returns an error", async () => {
    mockFetch(
      JSON.stringify({
        error: "Some error",
      }),
      400
    );
    await expect(
      refresh("some refresh token", mockIssuer(), mockClient())
    ).rejects.toThrow("Token endpoint returned error [Some error]");
  });

  it("returns the access, ID and refresh tokens, as well as the WebID, DPoP key and expiration date if applicable", async () => {
    mockFetch(
      JSON.stringify({
        ...mockDpopTokens(),
        refresh_token: "Some new refresh token",
        expires_in: 1800,
      }),
      200
    );
    const client = mockClient();
    const keyPair = await mockKeyPair();
    const result = await refresh(
      "some refresh token",
      mockIssuer(),
      client,
      keyPair
    );
    expect(result.accessToken).toBe(JSON.stringify(mockKeyBoundToken()));
    expect(result.idToken).toBe(mockIdToken());
    expect(result.refreshToken).toBe("Some new refresh token");
    expect(result.webId).toBe(mockWebId());
    expect(result.dpopKey).toEqual(keyPair);
    expect(result.expiresIn).toBe(1800);
  });
});
