/*
 * Copyright 2021 Inrupt Inc.
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

import { it, describe } from "@jest/globals";

import { JWKECKey } from "jose";
import { Response } from "cross-fetch";
import { IClient, IIssuerConfig } from "../common/types";

import {
  getBearerToken,
  getDpopToken,
  getTokens,
  TokenEndpointInput,
  validateTokenEndpointResponse,
} from "./tokenExchange";
import { decodeJwt, signJwt } from "./dpop";

// Some spec-compliant claims are camel-cased.
/* eslint-disable camelcase */

const mockJwk = (): JWKECKey => {
  return {
    kty: "EC",
    kid: "oOArcXxcwvsaG21jAx_D5CHr4BgVCzCEtlfmNFQtU0s",
    alg: "ES256",
    crv: "P-256",
    x: "0dGe_s-urLhD3mpqYqmSXrqUZApVV5ZNxMJXg7Vp-2A",
    y: "-oMe9gGkpfIrnJ0aiSUHMdjqYVm5ZrGCeQmRKoIIfj8",
    d: "yR1bCsR7m4hjFCvWo8Jw3OfNR4aiYDAFbBD9nkudJKM",
  };
};

// The two following modules introduce randomness in the process, which prevents
// making assumptions on the returned values. Mocking them out makes keys and
// DPoP headers predictible.
jest.mock("./keyGeneration", () => {
  return {
    generateJwkForDpop: (): JWKECKey => mockJwk(),
  };
});

jest.mock("uuid", () => {
  return {
    v4: (): string => "1234",
  };
});

const mockIssuer = (): IIssuerConfig => {
  return {
    issuer: "https://some.issuer",
    authorizationEndpoint: "https://some.issuer/autorization",
    tokenEndpoint: "https://some.issuer/token",
    jwksUri: "https://some.issuer/keys",
    claimsSupported: ["code", "openid"],
    subjectTypesSupported: ["public", "pairwise"],
    registrationEndpoint: "https://some.issuer/registration",
    grantTypesSupported: ["authorization_code"],
  };
};

const mockWebId = (): string => "https://my.webid";

const mockEndpointInput = (): TokenEndpointInput => {
  return {
    grantType: "authorization_code",
    code: "some code",
    codeVerifier: "some pkce token",
    redirectUri: "https://my.app/redirect",
  };
};

// The following function is only there to be used manually if
// the JWT needed to be manually re-generated.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function generateMockJwt(): Promise<void> {
  const payload = {
    sub: "https://my.webid",
    iss: mockIssuer().issuer.toString(),
  };
  const jwt = await signJwt(payload, mockJwk(), {
    algorithm: "ES256",
  });
  // This is for manual use.
  // eslint-disable-next-line no-console
  console.log(jwt.toString());
}

// result of generateMockJwt()
const mockIdToken = (): string =>
  "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJodHRwczovL215LndlYmlkIiwiaXNzIjoiaHR0cHM6Ly9zb21lLmlzc3VlciIsImlhdCI6MTYwMjQ5MTk5N30.R0hNKpCR3J8fS6JkTGTuFdz43_2zBMAQvCejSEO5S88DEaMQ4ktOYT__VfPmS7DHLt6Mju-J9bEc4twCnPxXjA";

type AccessJwt = {
  sub: string;
  iss: string;
  aud: string;
  nbf: number;
  exp: number;
  cnf: {
    jkt: string;
  };
};

const mockKeyBoundToken = (): AccessJwt => {
  return {
    sub: mockWebId(),
    iss: mockIssuer().issuer.toString(),
    aud: "https://resource.example.org",
    nbf: 1562262611,
    exp: 1562266216,
    cnf: {
      jkt: mockJwk().kid as string,
    },
  };
};

const mockBearerAccessToken = (): string => "some token";

type TokenEndpointRawResponse = {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  token_type: string;
};

const mockBearerTokens = (): TokenEndpointRawResponse => {
  return {
    access_token: mockBearerAccessToken(),
    id_token: mockIdToken(),
    token_type: "Bearer",
  };
};

const mockDpopTokens = (): TokenEndpointRawResponse => {
  return {
    access_token: JSON.stringify(mockKeyBoundToken()),
    id_token: mockIdToken(),
    token_type: "DPoP",
  };
};

const mockClient = (): IClient => {
  return {
    clientId: "some client",
  };
};

const mockFetch = (
  payload: string,
  status: number
): jest.Mock<ReturnType<typeof window.fetch>, [RequestInfo, RequestInit?]> => {
  const mockedFetch = jest.fn(
    async (
      _url: RequestInfo,
      _init?: RequestInit
    ): ReturnType<typeof window.fetch> => new Response(payload, { status })
  );
  global.fetch = mockedFetch;
  return mockedFetch;
};

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
        validateTokenEndpointResponse(fakeValidResponse, true)
      ).not.toThrow();
    });

    it("does not throw when the Response does not contain an expiration time", () => {
      expect(() =>
        validateTokenEndpointResponse(fakeTokenEndpointResponse, true)
      ).not.toThrow();
    });

    it("throws when the Response contains an invalid expiration time", () => {
      const fakeInvalidResponse = {
        ...fakeTokenEndpointResponse,
        expires_in: "Not a number",
      };
      expect(() =>
        validateTokenEndpointResponse(fakeInvalidResponse, true)
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
        validateTokenEndpointResponse(fakeValidResponse, false)
      ).not.toThrow();
    });

    it("does not throw when the Response does not contain an expiration time", () => {
      expect(() =>
        validateTokenEndpointResponse(fakeTokenEndpointResponse, false)
      ).not.toThrow();
    });

    it("throws when the Response contains an invalid expiration time", () => {
      const fakeInvalidResponse = {
        ...fakeTokenEndpointResponse,
        expires_in: "Not a number",
      };
      expect(() =>
        validateTokenEndpointResponse(fakeInvalidResponse, false)
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
        redirectUri: "https://my.app/redirect",
      },
      true
    );
    await expect(tokenRequest).rejects.toThrow(
      `The issuer [${mockIssuer().issuer.toString()}] does not support the [some_custom_grant] grant`
    );
  });

  it("throws if the token endpoint is missing", async () => {
    const issuer = {
      issuer: "https://some.issuer",
      authorizationEndpoint: "https://some.issuer/autorization",
      jwksUri: "https://some.issuer/keys",
      claimsSupported: ["code", "openid"],
      subjectTypesSupported: ["public", "pairwise"],
      registrationEndpoint: "https://some.issuer/registration",
      grantTypesSupported: ["authorization_code"],
      // Note that the token endpoint is missing, which mandates the type assertion
    } as IIssuerConfig;
    const tokenRequest = getTokens(
      issuer,
      mockClient(),
      mockEndpointInput(),
      true
    );
    await expect(tokenRequest).rejects.toThrow(
      `This issuer [${issuer.issuer.toString()}] does not have a token endpoint`
    );
  });

  it("can request a key-bound token", async () => {
    const myFetch = mockFetch(JSON.stringify(mockDpopTokens()), 200);
    await getTokens(mockIssuer(), mockClient(), mockEndpointInput(), true);
    expect(myFetch.mock.calls[0][0]).toBe(
      mockIssuer().tokenEndpoint.toString()
    );
    const headers = myFetch.mock.calls[0][1]?.headers as Record<string, string>;
    const dpopJwt = await decodeJwt(headers.DPoP, mockJwk());
    expect(dpopJwt.htu).toEqual(mockIssuer().tokenEndpoint.toString());
    expect(dpopJwt.htm).toEqual("POST");
    expect(dpopJwt.jti).toEqual("1234");
  });

  it("does not use basic auth if a client secret is not available", async () => {
    const myFetch = mockFetch(JSON.stringify(mockDpopTokens()), 200);
    await getTokens(mockIssuer(), mockClient(), mockEndpointInput(), true);
    expect(myFetch.mock.calls[0][0]).toBe(
      mockIssuer().tokenEndpoint.toString()
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
      mockIssuer().tokenEndpoint.toString()
    );
    const headers = myFetch.mock.calls[0][1]?.headers as Record<string, string>;
    // c29tZSBjbGllbnQ6c29tZSBzZWNyZXQ= is 'some client:some secret' encoded in base 64
    expect(headers.Authorization).toEqual(
      "Basic c29tZSBjbGllbnQ6c29tZSBzZWNyZXQ="
    );
  });

  // This test is currently disabled due to the behaviours of both NSS and the ID broker, which return
  // token_type: 'Bearer' even when returning a DPoP token.
  // https://github.com/solid/oidc-op/issues/26
  // Fixed, but unreleased for the ESS (current version: inrupt-oidc-server-0.5.2)
  it.skip("throws if a key-bound token was requested, but a bearer token is returned", async () => {
    mockFetch(JSON.stringify(mockBearerTokens()), 200);
    const request = getTokens(
      mockIssuer(),
      mockClient(),
      mockEndpointInput(),
      true
    );
    await expect(request).rejects.toThrow(
      `Invalid token endpoint response: requested a [DPoP] token, but got a 'token_type' value of [Bearer].`
    );
  });

  it("throws if a bearer token was requested, but a dpop token is returned", async () => {
    mockFetch(JSON.stringify(mockDpopTokens()), 200);
    const request = getTokens(
      mockIssuer(),
      mockClient(),
      mockEndpointInput(),
      false
    );
    await expect(request).rejects.toThrow(
      `Invalid token endpoint response: requested a [Bearer] token, but got a 'token_type' value of [DPoP].`
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
      false
    );
    await expect(request).rejects.toThrow(
      `Invalid token endpoint response (missing the field 'token_type'): ${JSON.stringify(
        tokenResponse
      )}`
    );
  });

  // See https://tools.ietf.org/html/rfc6749#page-29 for the required parameters
  it("includes the mandatory parameters in the request body as an URL encoded form", async () => {
    const myFetch = mockFetch(JSON.stringify(mockDpopTokens()), 200);
    await getTokens(mockIssuer(), mockClient(), mockEndpointInput(), true);
    const headers = myFetch.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers["content-type"]).toEqual(
      "application/x-www-form-urlencoded"
    );
    const body = myFetch.mock.calls[0][1]?.body as string;
    expect(body).toEqual(
      "grant_type=authorization_code&redirect_uri=https%3A%2F%2Fmy.app%2Fredirect&code=some+code&code_verifier=some+pkce+token&client_id=some+client"
    );
  });

  it("returns the generated key along with the tokens", async () => {
    mockFetch(JSON.stringify(mockDpopTokens()), 200);
    const result = await getTokens(
      mockIssuer(),
      mockClient(),
      mockEndpointInput(),
      true
    );
    expect(result?.dpopJwk).toEqual(mockJwk());
  });

  it("returns the tokens provided by the IdP", async () => {
    mockFetch(JSON.stringify(mockDpopTokens()), 200);
    const result = await getTokens(
      mockIssuer(),
      mockClient(),
      mockEndpointInput(),
      true
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
      true
    );
    expect(result?.refreshToken).toEqual("some token");
  });

  it("throws if the access token is missing", async () => {
    const tokenEndpointResponse = {
      id_token: mockIdToken(),
    };
    mockFetch(JSON.stringify(tokenEndpointResponse), 200);
    await expect(
      getTokens(mockIssuer(), mockClient(), mockEndpointInput(), true)
    ).rejects.toThrow(
      `Invalid token endpoint response (missing the field 'access_token'): ${JSON.stringify(
        tokenEndpointResponse
      )}`
    );
  });

  it("throws if the ID token is missing", async () => {
    const tokenEndpointResponse = {
      access_token: mockBearerAccessToken(),
    };
    mockFetch(JSON.stringify(tokenEndpointResponse), 200);
    await expect(
      getTokens(mockIssuer(), mockClient(), mockEndpointInput(), true)
    ).rejects.toThrow(
      `Invalid token endpoint response (missing the field 'id_token'): ${JSON.stringify(
        tokenEndpointResponse
      )}`
    );
  });

  it("does not return a key with regular bearer tokens", async () => {
    mockFetch(JSON.stringify(mockBearerTokens()), 200);
    const result = await getTokens(
      mockIssuer(),
      mockClient(),
      mockEndpointInput(),
      false
    );
    expect(result?.dpopJwk).toBeUndefined();
  });

  it("derives a WebId from the custom claim if available", async () => {
    const payload = {
      webid: "https://my.webid",
      sub: "some subject",
      iss: mockIssuer().issuer.toString(),
    };
    const idJwt = await signJwt(payload, mockJwk(), {
      algorithm: "ES256",
    });

    mockFetch(
      JSON.stringify({
        access_token: mockBearerAccessToken(),
        id_token: idJwt,
        token_type: "Bearer",
      }),
      200
    );
    const result = await getTokens(
      mockIssuer(),
      mockClient(),
      mockEndpointInput(),
      false
    );
    expect(result?.webId).toEqual(payload.webid);
  });

  it("derives a WebID from a localhost IRI in the sub", async () => {
    const payload = {
      sub: "https://localhost:8443/profile/card#me",
      iss: mockIssuer().issuer.toString(),
    };
    const idJwt = await signJwt(payload, mockJwk(), {
      algorithm: "ES256",
    });

    mockFetch(
      JSON.stringify({
        access_token: mockBearerAccessToken(),
        id_token: idJwt,
        token_type: "Bearer",
      }),
      200
    );
    const result = await getTokens(
      mockIssuer(),
      mockClient(),
      mockEndpointInput(),
      false
    );
    expect(result?.webId).toEqual(payload.sub);
  });

  it("throws if no webid can be derived from the ID token", async () => {
    const payload = {
      sub: "some subject",
      iss: mockIssuer().issuer.toString(),
    };
    const idJwt = await signJwt(payload, mockJwk(), {
      algorithm: "ES256",
    });

    mockFetch(
      JSON.stringify({
        access_token: mockBearerAccessToken(),
        id_token: idJwt,
        token_type: "Bearer",
      }),
      200
    );
    await expect(
      getTokens(mockIssuer(), mockClient(), mockEndpointInput(), false)
    ).rejects.toThrow(
      `Cannot extract WebID from ID token: the ID token returned by [${mockIssuer().issuer.toString()}] has no 'webid' claim, nor an IRI-like 'sub' claim: [some subject]`
    );
  });

  it("throws if the ID token has no sub claim", async () => {
    const payload = {
      iss: mockIssuer().issuer.toString(),
    };
    const idJwt = await signJwt(payload, mockJwk(), {
      algorithm: "ES256",
    });

    mockFetch(
      JSON.stringify({
        access_token: mockBearerAccessToken(),
        id_token: idJwt,
        token_type: "Bearer",
      }),
      200
    );
    await expect(
      getTokens(mockIssuer(), mockClient(), mockEndpointInput(), false)
    ).rejects.toThrow(
      /Invalid ID token: {.+} is missing 'sub' or 'iss' claims/
    );
  });

  it("throws if the ID token has no iss claim", async () => {
    const payload = {
      sub: "https://my.webid",
    };
    const idJwt = await signJwt(payload, mockJwk(), {
      algorithm: "ES256",
    });

    mockFetch(
      JSON.stringify({
        access_token: mockBearerAccessToken(),
        id_token: idJwt,
        token_type: "Bearer",
      }),
      200
    );
    await expect(
      getTokens(mockIssuer(), mockClient(), mockEndpointInput(), false)
    ).rejects.toThrow(
      /Invalid ID token: {.+} is missing 'sub' or 'iss' claims/
    );
  });
});

describe("getDpopToken", () => {
  it("requests a key-bound token, and returns the appropriate key with the token", async () => {
    const myFetch = mockFetch(JSON.stringify(mockDpopTokens()), 200);
    const tokens = await getDpopToken(
      mockIssuer(),
      mockClient(),
      mockEndpointInput()
    );
    expect(myFetch.mock.calls[0][0]).toBe(
      mockIssuer().tokenEndpoint.toString()
    );
    const headers = myFetch.mock.calls[0][1]?.headers as Record<string, string>;
    const dpopJwt = await decodeJwt(headers.DPoP, mockJwk());
    expect(dpopJwt.htu).toEqual(mockIssuer().tokenEndpoint.toString());
    expect(dpopJwt.htm).toEqual("POST");
    expect(dpopJwt.jti).toEqual("1234");
    expect(tokens.dpopJwk).not.toBeUndefined();
  });
});

jest.mock("oidc-client", () => {
  const { processSigninResponse } = jest.requireActual("oidc-client");
  return {
    OidcClient: jest.fn().mockImplementation(() => {
      return {
        processSigninResponse: async (
          redirectUrl: string
        ): Promise<ReturnType<typeof processSigninResponse>> => {
          if (redirectUrl === "https://invalid.url") {
            throw new Error("Dummy error");
          }
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore Ignore because we don't need to mock out all data fields.
          return Promise.resolve({
            access_token: mockBearerAccessToken(),
            id_token: mockIdToken(),
          });
        },
      };
    }),
  };
});

describe("getBearerToken", () => {
  it("returns the tokens returned by the endpoint", async () => {
    mockFetch(JSON.stringify(mockBearerTokens()), 200);
    const tokens = await getBearerToken("https://my.app/redirect");
    expect(tokens.accessToken).toEqual(mockBearerAccessToken());
    expect(tokens.idToken).toEqual(mockIdToken());
    expect(tokens.dpopJwk).toBeUndefined();
  });

  it("wraps oidc-client errors", async () => {
    mockFetch("", 200);
    const tokenRequest = getBearerToken("https://invalid.url");
    await expect(tokenRequest).rejects.toThrow(
      `Problem handling Auth Code Grant (Flow) redirect - URL [https://invalid.url]: Error: Dummy error`
    );
  });
});
