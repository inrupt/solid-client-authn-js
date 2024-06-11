//
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

import { jest, it, describe, expect } from "@jest/globals";
import type { IIssuerConfig } from "@inrupt/solid-client-authn-core";

import { getTokens, validateTokenEndpointResponse } from "./tokenExchange";
import {
  mockBearerAccessToken,
  mockBearerTokens,
  mockClient,
  mockDpopTokens,
  mockEndpointInput,
  mockFetch,
  mockIdToken,
  mockIssuer,
  mockKeyBoundToken,
} from "../__mocks__/issuer.mocks";

// Some spec-compliant claims are camel-cased.
/* eslint-disable camelcase */

jest.mock("@inrupt/solid-client-authn-core", () => {
  const actualCoreModule = jest.requireActual(
    "@inrupt/solid-client-authn-core",
  ) as any;
  return {
    ...actualCoreModule,
    // This works around the network lookup to the JWKS in order to validate the ID token.
    getWebidFromTokenPayload: jest.fn(() =>
      Promise.resolve({ webId: "https://my.webid/", clientId: "some client" }),
    ),
  };
});

// The following module introduces randomness in the process, which prevents
// making assumptions on the returned values. Mocking them out makes keys and
// DPoP headers predictible.
jest.mock("uuid", () => {
  return {
    v4: (): string => "1234",
  };
});

describe("validateTokenEndpointResponse", () => {
  describe("for DPoP tokens", () => {
    const fakeTokenEndpointResponse = {
      access_token: "Arbitrary access token",
      id_token: "Arbitrary ID token",
      token_type: "DPoP",
    };

    it("does not throw when the Response contains a valid expiration time", () => {
      const fakeValidResponse = {
        ...fakeTokenEndpointResponse,
        expires_in: 1337,
      };
      expect(() =>
        validateTokenEndpointResponse(fakeValidResponse, true),
      ).not.toThrow();
    });

    it("does not throw when the Response does not contain an expiration time", () => {
      expect(() =>
        validateTokenEndpointResponse(fakeTokenEndpointResponse, true),
      ).not.toThrow();
    });

    it("throws when the Response contains an invalid expiration time", () => {
      const fakeInvalidResponse = {
        ...fakeTokenEndpointResponse,
        expires_in: "Not a number",
      };
      expect(() =>
        validateTokenEndpointResponse(fakeInvalidResponse, true),
      ).toThrow();
    });
  });

  describe("for Bearer tokens", () => {
    const fakeTokenEndpointResponse = {
      access_token: "Arbitrary access token",
      id_token: "Arbitrary ID token",
      token_type: "Bearer",
    };

    it("does not throw when the Response contains a valid expiration time", () => {
      const fakeValidResponse = {
        ...fakeTokenEndpointResponse,
        expires_in: 1337,
      };
      expect(() =>
        validateTokenEndpointResponse(fakeValidResponse, false),
      ).not.toThrow();
    });

    it("does not throw when the Response does not contain an expiration time", () => {
      expect(() =>
        validateTokenEndpointResponse(fakeTokenEndpointResponse, false),
      ).not.toThrow();
    });

    it("throws when the Response contains an invalid expiration time", () => {
      const fakeInvalidResponse = {
        ...fakeTokenEndpointResponse,
        expires_in: "Not a number",
      };
      expect(() =>
        validateTokenEndpointResponse(fakeInvalidResponse, false),
      ).toThrow();
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
      // Note that the token endpoint is missing, which mandates the type assertion
    } as IIssuerConfig;
    const tokenRequest = getTokens(
      issuer,
      mockClient(),
      mockEndpointInput(),
      true,
    );
    await expect(tokenRequest).rejects.toThrow(
      `This issuer [${issuer.issuer.toString()}] does not have a token endpoint`,
    );
  });

  it("can request a key-bound token", async () => {
    const myFetch = mockFetch(JSON.stringify(mockDpopTokens()), 200);
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const core = jest.requireMock("@inrupt/solid-client-authn-core") as any;
    core.createDpopHeader = jest.fn(() => Promise.resolve("some DPoP header"));
    await getTokens(mockIssuer(), mockClient(), mockEndpointInput(), true);
    expect(myFetch.mock.calls[0][0]).toBe(
      mockIssuer().tokenEndpoint.toString(),
    );
    const headers = myFetch.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.DPoP).toBe("some DPoP header");
  });

  it("does not use basic auth if a client secret is not available", async () => {
    const myFetch = mockFetch(JSON.stringify(mockDpopTokens()), 200);
    await getTokens(mockIssuer(), mockClient(), mockEndpointInput(), true);
    expect(myFetch.mock.calls[0][0]).toBe(
      mockIssuer().tokenEndpoint.toString(),
    );
    const headers = myFetch.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it("uses basic auth if a client secret is available", async () => {
    const myFetch = mockFetch(JSON.stringify(mockDpopTokens()), 200);
    const client = mockClient();
    client.clientSecret = "some secret";
    await getTokens(mockIssuer(), client, mockEndpointInput(), true);
    expect(myFetch.mock.calls[0][0]).toBe(
      mockIssuer().tokenEndpoint.toString(),
    );
    const headers = myFetch.mock.calls[0][1]?.headers as Record<string, string>;
    // c29tZSBjbGllbnQ6c29tZSBzZWNyZXQ= is 'some client:some secret' encoded in base 64
    expect(headers.Authorization).toBe(
      "Basic c29tZSBjbGllbnQ6c29tZSBzZWNyZXQ=",
    );
  });

  // This test is currently disabled due to the behaviours of both NSS and the ID broker, which return
  // token_type: 'Bearer' even when returning a DPoP token.
  // https://github.com/solid/oidc-op/issues/26
  // Fixed, but unreleased for the ESS (current version: inrupt-oidc-server-0.5.2)
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip("throws if a key-bound token was requested, but a bearer token is returned", async () => {
    mockFetch(JSON.stringify(mockBearerTokens()), 200);
    const request = getTokens(
      mockIssuer(),
      mockClient(),
      mockEndpointInput(),
      true,
    );
    await expect(request).rejects.toThrow(
      `Invalid token endpoint response: requested a [DPoP] token, but got a 'token_type' value of [Bearer].`,
    );
  });

  it("throws if a bearer token was requested, but a dpop token is returned", async () => {
    mockFetch(JSON.stringify(mockDpopTokens()), 200);
    const request = getTokens(
      mockIssuer(),
      mockClient(),
      mockEndpointInput(),
      false,
    );
    await expect(request).rejects.toThrow(
      `Invalid token endpoint response: requested a [Bearer] token, but got a 'token_type' value of [DPoP].`,
    );
  });

  it("throws if the token type is unspecified", async () => {
    const tokenResponse = {
      access_token: mockBearerAccessToken(),
      id_token: mockIdToken(),
    };
    mockFetch(JSON.stringify(tokenResponse), 200);
    const request = getTokens(
      mockIssuer(),
      mockClient(),
      mockEndpointInput(),
      false,
    );
    await expect(request).rejects.toThrow("token_type");
  });

  // See https://tools.ietf.org/html/rfc6749#page-29 for the required parameters
  it("includes the mandatory parameters in the request body as an URL encoded form", async () => {
    const myFetch = mockFetch(JSON.stringify(mockDpopTokens()), 200);
    await getTokens(mockIssuer(), mockClient(), mockEndpointInput(), true);
    const headers = myFetch.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers["content-type"]).toBe("application/x-www-form-urlencoded");
    const body = myFetch.mock.calls[0][1]?.body as string;
    expect(body).toBe(
      "grant_type=authorization_code&redirect_uri=https%3A%2F%2Fmy.app%2Fredirect&code=some+code&code_verifier=some+pkce+token&client_id=some+client",
    );
  });

  it("returns the generated key along with the tokens", async () => {
    mockFetch(JSON.stringify(mockDpopTokens()), 200);
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const core = jest.requireMock("@inrupt/solid-client-authn-core") as any;
    core.generateDpopKeyPair = jest.fn(() =>
      Promise.resolve("some DPoP key pair"),
    );
    const result = await getTokens(
      mockIssuer(),
      mockClient(),
      mockEndpointInput(),
      true,
    );
    expect(result?.dpopKey).toBe("some DPoP key pair");
  });

  it("returns the tokens provided by the IdP", async () => {
    mockFetch(JSON.stringify(mockDpopTokens()), 200);
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
    const idpResponse = mockDpopTokens();
    idpResponse.refresh_token = "some token";
    mockFetch(JSON.stringify(idpResponse), 200);
    const result = await getTokens(
      mockIssuer(),
      mockClient(),
      mockEndpointInput(),
      true,
    );
    expect(result?.refreshToken).toBe("some token");
  });

  it("throws if the access token is missing", async () => {
    const tokenEndpointResponse = {
      id_token: mockIdToken(),
    };
    mockFetch(JSON.stringify(tokenEndpointResponse), 200);
    await expect(
      getTokens(mockIssuer(), mockClient(), mockEndpointInput(), true),
    ).rejects.toThrow("access_token");
  });

  it("throws if the ID token is missing", async () => {
    const tokenEndpointResponse = {
      access_token: mockBearerAccessToken(),
    };
    mockFetch(JSON.stringify(tokenEndpointResponse), 200);
    await expect(
      getTokens(mockIssuer(), mockClient(), mockEndpointInput(), true),
    ).rejects.toThrow("id_token");
  });

  it("throws if the token endpoint returned an error", async () => {
    const tokenEndpointResponse = {
      error: "SomeError",
    };
    mockFetch(JSON.stringify(tokenEndpointResponse), 400);
    await expect(
      getTokens(mockIssuer(), mockClient(), mockEndpointInput(), true),
    ).rejects.toThrow(`Token endpoint returned error [SomeError]`);
  });

  it("throws if the token endpoint returned an error, and shows its description when available", async () => {
    const tokenEndpointResponse = {
      error: "SomeError",
      error_description: "This is an error.",
    };
    mockFetch(JSON.stringify(tokenEndpointResponse), 400);
    await expect(
      getTokens(mockIssuer(), mockClient(), mockEndpointInput(), true),
    ).rejects.toThrow(
      `Token endpoint returned error [SomeError]: This is an error`,
    );
  });

  it("throws if the token endpoint returned an error, and shows the associated URI when available", async () => {
    const tokenEndpointResponse = {
      error: "SomeError",
      error_uri: "https://some.vocab/error#id",
    };
    mockFetch(JSON.stringify(tokenEndpointResponse), 400);
    await expect(
      getTokens(mockIssuer(), mockClient(), mockEndpointInput(), true),
    ).rejects.toThrow(
      `Token endpoint returned error [SomeError] (see https://some.vocab/error#id)`,
    );
  });

  it("does not return a key with regular bearer tokens", async () => {
    mockFetch(JSON.stringify(mockBearerTokens()), 200);
    const result = await getTokens(
      mockIssuer(),
      mockClient(),
      mockEndpointInput(),
      false,
    );
    expect(result?.dpopKey).toBeUndefined();
  });

  it("derives a WebId and clientId from the ID token", async () => {
    mockFetch(JSON.stringify(mockBearerTokens()), 200);
    /* eslint-disable @typescript-eslint/no-explicit-any */
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

  it("requests a key-bound token, and returns the appropriate key with the token", async () => {
    const myFetch = mockFetch(JSON.stringify(mockDpopTokens()), 200);
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const core = jest.requireMock("@inrupt/solid-client-authn-core") as any;
    core.createDpopHeader = jest.fn(() => Promise.resolve("some DPoP header"));
    core.generateDpopKeyPair = jest.fn(() => Promise.resolve("some DPoP keys"));
    const tokens = await getTokens(
      mockIssuer(),
      mockClient(),
      mockEndpointInput(),
      true,
    );
    expect(myFetch.mock.calls[0][0]).toBe(
      mockIssuer().tokenEndpoint.toString(),
    );
    const headers = myFetch.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.DPoP).toBe("some DPoP header");
    expect(tokens.dpopKey).toBe("some DPoP keys");
  });
});
