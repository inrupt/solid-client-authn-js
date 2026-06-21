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

import { jest, it, describe, expect, beforeEach } from "@jest/globals";
import type { IIssuerConfig } from "@inrupt/solid-client-authn-core";

import { getTokens, validateTokenEndpointResponse } from "./tokenExchange";
import {
  mockClient,
  mockDpopTokens,
  mockEndpointInput,
  mockIdToken,
  mockIssuer,
  mockKeyBoundToken,
} from "../__mocks__/issuer.mocks";

// Camelcase identifiers are required in the OIDC specification.
/* eslint-disable camelcase*/

// ---------------------------------------------------------------------------
// MIGRATION (Phase 2): the implementation now delegates the auth-code → token
// exchange to oauth4webapi. We therefore mock `oauth4webapi`'s grant helpers
// rather than the global `fetch`. This mirrors the reference testing style of
// `@solid/reactive-authentication` (mock the library boundary, not the wire).
//
// NOTE (CI-validate): these mocks assume the exact oauth4webapi v3 function
// names/return shapes documented in MIGRATION-oauth4webapi.md. They cannot be
// executed in this branch (deps are not installed); run under CI once the
// lockfile resolves. A few wire-level assertions from the legacy spec (exact
// URL-encoded body, Basic-auth header byte string) now live inside oauth4webapi
// and are dropped here — covered instead by oauth4webapi's own test-suite and by
// the conformance run.
// ---------------------------------------------------------------------------

jest.mock("oauth4webapi", () => {
  const actual = jest.requireActual("oauth4webapi") as any;
  return {
    ...actual,
    authorizationCodeGrantRequest: jest.fn(() =>
      Promise.resolve(new Response()),
    ),
    processAuthorizationCodeResponse: jest.fn(),
    DPoP: jest.fn(() => ({ calculateThumbprint: jest.fn() })),
    // Keep the real ClientSecretBasic/None/expectNoNonce symbols from `actual`.
  };
});

jest.mock("@inrupt/solid-client-authn-core", () => {
  const actualCoreModule = jest.requireActual(
    "@inrupt/solid-client-authn-core",
  ) as any;
  return {
    ...actualCoreModule,
    // Avoid the network lookup to the JWKS when validating the ID token.
    getWebidFromTokenPayload: jest.fn(() =>
      Promise.resolve({ webId: "https://my.webid/", clientId: "some client" }),
    ),
    // Avoid real key generation; return a stub KeyPair-shaped object.
    generateDpopKeyPair: jest.fn(() =>
      Promise.resolve({ privateKey: "private", publicKey: { alg: "ES256" } }),
    ),
  };
});

// eslint-disable-next-line import/first
import * as oauth from "oauth4webapi";

const mockedProcess = oauth.processAuthorizationCodeResponse as jest.Mock<any>;
const mockedGrant = oauth.authorizationCodeGrantRequest as jest.Mock<any>;

function mockProcessedResponse(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    access_token: JSON.stringify(mockKeyBoundToken()),
    id_token: mockIdToken(),
    token_type: "DPoP",
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedGrant.mockResolvedValue(new Response());
  mockedProcess.mockResolvedValue(mockProcessedResponse());
});

describe("validateTokenEndpointResponse (retained helper)", () => {
  describe("for DPoP tokens", () => {
    const fakeTokenEndpointResponse = {
      access_token: "Arbitrary access token",
      id_token: "Arbitrary ID token",
      token_type: "DPoP",
    };

    it("does not throw when the Response contains a valid expiration time", () => {
      expect(() =>
        validateTokenEndpointResponse(
          { ...fakeTokenEndpointResponse, expires_in: 1337 },
          true,
        ),
      ).not.toThrow();
    });

    it("throws when the Response contains an invalid expiration time", () => {
      expect(() =>
        validateTokenEndpointResponse(
          { ...fakeTokenEndpointResponse, expires_in: "Not a number" },
          true,
        ),
      ).toThrow();
    });
  });

  describe("for Bearer tokens", () => {
    const fakeTokenEndpointResponse = {
      access_token: "Arbitrary access token",
      id_token: "Arbitrary ID token",
      token_type: "Bearer",
    };

    it("does not throw on a valid bearer response", () => {
      expect(() =>
        validateTokenEndpointResponse(fakeTokenEndpointResponse, false),
      ).not.toThrow();
    });
  });
});

describe("getTokens", () => {
  it("throws if the grant type isn't supported", async () => {
    const tokenRequest = getTokens(
      mockIssuer(),
      mockClient(),
      {
        grantType: "some_custom_grant",
        code: "some code",
        codeVerifier: "some pkce token",
        redirectUrl: "https://my.app/redirect",
      },
      true,
    );
    await expect(tokenRequest).rejects.toThrow(
      `The issuer [${mockIssuer().issuer.toString()}] does not support the [some_custom_grant] grant`,
    );
  });

  it("throws if the token endpoint is missing", async () => {
    const issuer = {
      issuer: "https://some.issuer",
      authorizationEndpoint: "https://some.issuer/autorization",
      jwksUri: "https://some.issuer/keys",
      claimsSupported: ["code", "openid"],
      subjectTypesSupported: ["public"],
      registrationEndpoint: "https://some.issuer/registration",
      grantTypesSupported: ["authorization_code"],
      // Note that the token endpoint is missing.
    } as IIssuerConfig;
    await expect(
      getTokens(issuer, mockClient(), mockEndpointInput(), true),
    ).rejects.toThrow(
      `This issuer [${issuer.issuer.toString()}] does not have a token endpoint`,
    );
  });

  it("requests a key-bound token and threads a DPoP handle into the grant", async () => {
    await getTokens(mockIssuer(), mockClient(), mockEndpointInput(), true);
    expect(oauth.DPoP).toHaveBeenCalledTimes(1);
    const grantOptions = mockedGrant.mock.calls[0][6];
    expect(grantOptions).toHaveProperty("DPoP");
  });

  it("does not create a DPoP handle for a bearer token", async () => {
    mockedProcess.mockResolvedValue(
      mockProcessedResponse({ token_type: "Bearer" }),
    );
    await getTokens(mockIssuer(), mockClient(), mockEndpointInput(), false);
    expect(oauth.DPoP).not.toHaveBeenCalled();
    const grantOptions = mockedGrant.mock.calls[0][6];
    expect(grantOptions).not.toHaveProperty("DPoP");
  });

  it("returns the generated key along with the tokens", async () => {
    const result = await getTokens(
      mockIssuer(),
      mockClient(),
      mockEndpointInput(),
      true,
    );
    // The mocked generateDpopKeyPair returns this stub shape.
    expect(result?.dpopKey).toEqual({
      privateKey: "private",
      publicKey: { alg: "ES256" },
    });
  });

  it("returns the tokens provided by the IdP", async () => {
    const result = await getTokens(
      mockIssuer(),
      mockClient(),
      mockEndpointInput(),
      true,
    );
    expect(result?.accessToken).toEqual(JSON.stringify(mockKeyBoundToken()));
    expect(result?.idToken).toEqual(mockIdToken());
    expect(result?.refreshToken).toBeUndefined();
  });

  it("returns a refresh token if provided by the IdP", async () => {
    mockedProcess.mockResolvedValue(
      mockProcessedResponse({ refresh_token: "some token" }),
    );
    const result = await getTokens(
      mockIssuer(),
      mockClient(),
      mockEndpointInput(),
      true,
    );
    expect(result?.refreshToken).toBe("some token");
  });

  it("derives a WebId and clientId from the ID token", async () => {
    const core = jest.requireMock("@inrupt/solid-client-authn-core") as any;
    core.getWebidFromTokenPayload = jest.fn(() =>
      Promise.resolve({
        webId: "https://some.webid#me",
        clientId: "some client",
      }),
    );
    const result = await getTokens(
      mockIssuer(),
      mockClient(),
      mockEndpointInput(),
      false,
    );
    expect(result?.webId).toBe("https://some.webid#me");
    expect(result?.clientId).toBe("some client");
  });

  it("maps an oauth4webapi ResponseBodyError onto OidcProviderError", async () => {
    mockedProcess.mockRejectedValue(
      Object.assign(new oauth.ResponseBodyError("err", {} as any), {
        error: "SomeError",
        error_description: "This is an error.",
      }),
    );
    await expect(
      getTokens(mockIssuer(), mockClient(), mockEndpointInput(), true),
    ).rejects.toThrow("Token endpoint returned error [SomeError]");
  });

  it.todo(
    "retries the grant once on a use_dpop_nonce challenge (CI: needs real oauth4webapi to construct the nonce error)",
  );
});
