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

/**
 * Test for ClientCredentialsOidcHandler
 */
import type * as SolidClientAuthnCore from "@inrupt/solid-client-authn-core";
import {
  jest,
  it,
  describe,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
} from "@jest/globals";
import type * as OpenidClient from "openid-client";
import type { CryptoKey } from "jose";
import {
  decodeJwt,
  decodeProtectedHeader,
  generateKeyPair,
  SignJWT,
} from "jose";
import { randomUUID } from "crypto";
import { EventEmitter } from "events";
import { EVENTS, OidcProviderError } from "@inrupt/solid-client-authn-core";
import { mockDefaultTokenRefresher } from "../refresh/__mocks__/TokenRefresher";
import { standardOidcOptions } from "../__mocks__/IOidcOptions";
import ClientCredentialsOidcHandler from "./ClientCredentialsOidcHandler";

import { mockDefaultClient } from "../__mocks__/ClientRegistrar";

// Camelcase identifiers are required in the OIDC specification.
/* eslint-disable camelcase*/

// openid-client is used for real, the network is mocked instead. The token
// grant is only wrapped in a spy so that responses which openid-client would
// reject can be fed to the handler.
jest.mock("openid-client", () => {
  const actual = jest.requireActual("openid-client") as typeof OpenidClient;
  return {
    ...actual,
    clientCredentialsGrant: jest.fn(actual.clientCredentialsGrant),
  };
});

const mockedFetch = jest.spyOn(globalThis, "fetch");

jest.mock("@inrupt/solid-client-authn-core", () => {
  const actualCoreModule = jest.requireActual(
    "@inrupt/solid-client-authn-core",
  ) as typeof SolidClientAuthnCore;
  return {
    ...actualCoreModule,
    // This works around the network lookup to the JWKS in order to validate the ID token.
    getWebidFromTokenPayload: jest.fn(),
  };
});
jest.useFakeTimers();
const DEFAULT_EXPIRATION_TIME_SECONDS = 300;

type AccessJwt = {
  webid: string;
  iss: string;
  aud: string;
  nbf: number;
  exp: number;
  cnf: {
    jkt: string;
  };
};

const mockWebId = (): string => "https://my.webid/";

const mockKeyBoundToken = (): AccessJwt => {
  return {
    webid: mockWebId(),
    iss: standardOidcOptions.issuer,
    aud: "https://resource.example.org",
    nbf: 1562262611,
    exp: 1562266216,
    cnf: {
      jkt: "oOArcXxcwvsaG21jAx_D5CHr4BgVCzCEtlfmNFQtU0s",
    },
  };
};

const idTokenSigningKeys: Record<string, CryptoKey> = {};

beforeAll(async () => {
  // The ID token signature isn't verified by openid-client, and the
  // verification done by the library is mocked, so any key works.
  idTokenSigningKeys.RS256 = (await generateKeyPair("RS256")).privateKey;
  idTokenSigningKeys.ES256 = (await generateKeyPair("ES256")).privateKey;
});

// Builds an ID token which passes the claims validation done by openid-client.
// Unless the issuer advertises the supported signing algorithms, openid-client
// expects ID tokens to be signed using RS256.
const mockIdToken = async (
  clientId: string,
  alg: "RS256" | "ES256" = "RS256",
): Promise<string> =>
  new SignJWT({})
    .setProtectedHeader({ alg })
    .setSubject(mockWebId())
    .setIssuer(standardOidcOptions.issuerConfiguration.issuer)
    .setAudience(clientId)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(idTokenSigningKeys[alg]);

type TokenEndpointBody = {
  access_token?: string;
  id_token?: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
};

const mockDpopTokens = async (clientId: string): Promise<TokenEndpointBody> => {
  return {
    access_token: JSON.stringify(mockKeyBoundToken()),
    id_token: await mockIdToken(clientId),
    token_type: "DPoP",
    expires_in: DEFAULT_EXPIRATION_TIME_SECONDS,
  };
};

const mockBearerTokens = async (
  clientId: string,
): Promise<TokenEndpointBody> => {
  return {
    access_token: "some token",
    id_token: await mockIdToken(clientId),
    token_type: "Bearer",
    expires_in: DEFAULT_EXPIRATION_TIME_SECONDS,
  };
};

// Mocks the token endpoint response.
const setupTokenEndpointMock = (tokens: TokenEndpointBody) => {
  mockedFetch.mockResolvedValueOnce(
    new Response(JSON.stringify(tokens), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
};

// Returns the request sent to the token endpoint, which is the first request.
const getTokenRequest = () => {
  const [url, init] = mockedFetch.mock.calls[0];
  return {
    url: url.toString(),
    method: init?.method,
    headers: new Headers(init?.headers),
    body: new URLSearchParams(init?.body as string | URLSearchParams),
  };
};

// openid-client wraps the underlying oauth4webapi errors in a generic error.
const openidClientError = (message: string, causeMessage: string) =>
  expect.objectContaining({
    message,
    cause: expect.objectContaining({ message: causeMessage }),
  });

const setupGetWebidMock = (webid: string, clientid?: string) => {
  const { getWebidFromTokenPayload } = jest.requireMock(
    "@inrupt/solid-client-authn-core",
  ) as jest.Mocked<typeof SolidClientAuthnCore>;
  getWebidFromTokenPayload.mockResolvedValueOnce({
    webId: webid,
    clientId: clientid,
  });
};

const mockStaticClient = (clientId: string = randomUUID()) => ({
  clientId,
  clientSecret: randomUUID(),
  clientType: "static" as const,
});

describe("ClientCredentialsOidcHandler", () => {
  describe("canHandle", () => {
    it("cannot handle if the client ID is missing", async () => {
      const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
        mockDefaultTokenRefresher(),
      );
      await expect(
        clientCredentialsOidcHandler.canHandle({
          ...standardOidcOptions,
          client: {
            // @ts-expect-error The client ID is undefined for test purposes.
            clientId: undefined,
            clientSecret: undefined,
            clientType: "static",
          },
        }),
      ).resolves.toBe(false);
    });

    it("cannot handle if the client secret is missing", async () => {
      const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
        mockDefaultTokenRefresher(),
      );
      await expect(
        clientCredentialsOidcHandler.canHandle({
          ...standardOidcOptions,
          client: {
            clientId: randomUUID(),
            clientSecret: randomUUID(),
            clientType: "static",
          },
        }),
      ).resolves.toBe(false);
    });

    it("cannot handle if the client is not statically registered", async () => {
      const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
        mockDefaultTokenRefresher(),
      );
      await expect(
        clientCredentialsOidcHandler.canHandle({
          ...standardOidcOptions,
          client: mockDefaultClient(),
        }),
      ).resolves.toBe(false);
    });

    it("can handle if both client ID and secret are present for a confidential client", async () => {
      const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
        mockDefaultTokenRefresher(),
      );
      await expect(
        clientCredentialsOidcHandler.canHandle({
          ...standardOidcOptions,
          client: {
            clientId: randomUUID(),
            clientSecret: randomUUID(),
            clientType: "static",
          },
          redirectUrl: undefined,
        }),
      ).resolves.toBe(true);
    });

    it("cannot handle if a redirectUrl has been specified (for auth code flow)", async () => {
      const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
        mockDefaultTokenRefresher(),
      );
      await expect(
        clientCredentialsOidcHandler.canHandle({
          ...standardOidcOptions,
          client: {
            clientId: randomUUID(),
            clientSecret: randomUUID(),
            clientType: "static",
          },
        }),
      ).resolves.toBe(false);
    });
  });
});

describe("handle", () => {
  beforeEach(() => {
    // Prevent any accidental network call.
    mockedFetch.mockRejectedValue(new Error("Unexpected network call"));
  });

  afterEach(() => {
    mockedFetch.mockReset();
  });

  it("throws if the issuer does not return an access token", async () => {
    const client = mockStaticClient();
    const tokens = await mockDpopTokens(client.clientId);
    tokens.access_token = undefined;
    setupTokenEndpointMock(tokens);
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockDefaultTokenRefresher(),
    );
    // openid-client rejects such a response itself...
    await expect(
      clientCredentialsOidcHandler.handle({
        ...standardOidcOptions,
        client,
      }),
    ).rejects.toEqual(
      openidClientError(
        "invalid response encountered",
        '"response" body "access_token" property must be a string',
      ),
    );

    // ... but the handler does not rely on it.
    const { clientCredentialsGrant } = jest.requireMock(
      "openid-client",
    ) as jest.Mocked<typeof OpenidClient>;
    clientCredentialsGrant.mockResolvedValueOnce(
      tokens as unknown as Awaited<
        ReturnType<typeof OpenidClient.clientCredentialsGrant>
      >,
    );
    await expect(
      clientCredentialsOidcHandler.handle({
        ...standardOidcOptions,
        client,
      }),
    ).rejects.toThrow(
      /Invalid response from Solid Identity Provider \[.+\]: \{.+\} is missing 'access_token'/,
    );
  });

  it("throws an OidcProviderError if the OpenID Provider returns an error", async () => {
    mockedFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: "invalid_client",
          error_description: "Unknown client",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    );
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockDefaultTokenRefresher(),
    );

    const error = await clientCredentialsOidcHandler
      .handle({
        ...standardOidcOptions,
        dpop: false,
        client: mockStaticClient("some client ID"),
      })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(OidcProviderError);
    expect(error).toMatchObject({
      message: "Token endpoint returned error [invalid_client]: Unknown client",
      error: "invalid_client",
      errorDescription: "Unknown client",
    });
  });

  it("requests a token using the client credentials grant and client_secret_basic authentication", async () => {
    const client = {
      ...mockStaticClient("some client ID"),
      clientSecret: "some-client secret",
    };
    setupTokenEndpointMock(await mockBearerTokens(client.clientId));
    setupGetWebidMock("https://my.webid/");
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockDefaultTokenRefresher(),
    );
    await clientCredentialsOidcHandler.handle({
      ...standardOidcOptions,
      dpop: false,
      client,
    });

    expect(mockedFetch).toHaveBeenCalledTimes(1);
    const request = getTokenRequest();
    expect(request.url).toBe(
      standardOidcOptions.issuerConfiguration.tokenEndpoint,
    );
    expect(request.method).toBe("POST");
    expect(request.body.get("grant_type")).toBe("client_credentials");
    // The client ID and secret are form-URL-encoded (RFC 6749, section 2.3.1).
    expect(request.headers.get("Authorization")).toBe(
      `Basic ${btoa("some+client+ID:some%2Dclient+secret")}`,
    );
    expect(request.body.has("client_secret")).toBe(false);
  });

  it("validates the ID token returned by the issuer", async () => {
    const client = mockStaticClient();
    const tokens = await mockDpopTokens(client.clientId);
    setupTokenEndpointMock(tokens);
    setupGetWebidMock("https://my.webid/");
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockDefaultTokenRefresher(),
    );
    await clientCredentialsOidcHandler.handle({
      ...standardOidcOptions,
      client,
    });

    const { getWebidFromTokenPayload } = jest.requireMock(
      "@inrupt/solid-client-authn-core",
    ) as jest.Mocked<typeof SolidClientAuthnCore>;
    expect(getWebidFromTokenPayload).toHaveBeenCalledWith(
      tokens.id_token as string,
      standardOidcOptions.issuerConfiguration.jwksUri,
      standardOidcOptions.issuer,
      client.clientId,
    );
  });

  it("expects an RS256-signed ID token if the issuer does not advertise supported signing algorithms", async () => {
    const client = mockStaticClient();
    const tokens = await mockDpopTokens(client.clientId);
    tokens.id_token = await mockIdToken(client.clientId, "ES256");
    setupTokenEndpointMock(tokens);
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockDefaultTokenRefresher(),
    );

    await expect(
      clientCredentialsOidcHandler.handle({
        ...standardOidcOptions,
        client,
      }),
    ).rejects.toEqual(
      openidClientError(
        "invalid response encountered",
        'unexpected JWT "alg" header parameter',
      ),
    );
  });

  it("accepts an ID token signed using an algorithm advertised by the issuer", async () => {
    const client = mockStaticClient();
    const tokens = await mockDpopTokens(client.clientId);
    tokens.id_token = await mockIdToken(client.clientId, "ES256");
    setupTokenEndpointMock(tokens);
    setupGetWebidMock("https://my.webid/");
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockDefaultTokenRefresher(),
    );

    const result = await clientCredentialsOidcHandler.handle({
      ...standardOidcOptions,
      issuerConfiguration: {
        ...standardOidcOptions.issuerConfiguration,
        idTokenSigningAlgValuesSupported: ["ES256", "RS256"],
      },
      client,
    });
    expect(result?.isLoggedIn).toBe(true);
  });

  it("throws if the issuer returns an ID token for another client", async () => {
    const client = mockStaticClient();
    const tokens = await mockDpopTokens("some other client");
    setupTokenEndpointMock(tokens);
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockDefaultTokenRefresher(),
    );

    await expect(
      clientCredentialsOidcHandler.handle({
        ...standardOidcOptions,
        client,
      }),
    ).rejects.toEqual(
      openidClientError(
        "unexpected JWT claim value encountered",
        'unexpected JWT "aud" (audience) claim value',
      ),
    );
  });

  // Note that this is a temporary fix, and it will eventually be removed from the
  // codebase once the client credential use case is properly covered by the authentication
  // panel.
  it("gets the WebID from the access token if the issuer does not return an ID token", async () => {
    const client = mockStaticClient();
    const tokens = await mockDpopTokens(client.clientId);
    tokens.id_token = undefined;
    setupTokenEndpointMock(tokens);
    setupGetWebidMock("https://my.webid/");
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockDefaultTokenRefresher(),
    );

    const sessionInfo = await clientCredentialsOidcHandler.handle({
      ...standardOidcOptions,
      client,
    });
    // The session's WebID should have been picked up from the access token in
    // the absence of an ID token.
    expect((sessionInfo as SolidClientAuthnCore.ISessionInfo).webId).toBe(
      "https://my.webid/",
    );
    const { getWebidFromTokenPayload } = jest.requireMock(
      "@inrupt/solid-client-authn-core",
    ) as jest.Mocked<typeof SolidClientAuthnCore>;
    expect(getWebidFromTokenPayload).toHaveBeenCalledWith(
      tokens.access_token as string,
      standardOidcOptions.issuerConfiguration.jwksUri,
      standardOidcOptions.issuer,
      "solid",
    );
  });

  // Note that this is a temporary fix, and it will eventually be removed from the
  // codebase once the client credential use case is properly covered by the authentication
  // panel. This encodes assumptions about the Access Token which have emerged
  // in the current implementations, but is out of scope of the Solid-OIDC specification.
  it("throws if the Access Token doesn't have the expected shape and the issuer does not return an ID token", async () => {
    const client = mockStaticClient();
    const tokens = await mockDpopTokens(client.clientId);
    tokens.id_token = undefined;
    setupTokenEndpointMock(tokens);
    const { getWebidFromTokenPayload } = jest.requireMock(
      "@inrupt/solid-client-authn-core",
    ) as jest.Mocked<typeof SolidClientAuthnCore>;
    // Pretend the token validation function throws
    getWebidFromTokenPayload.mockRejectedValueOnce(new Error("Bad audience"));
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockDefaultTokenRefresher(),
    );

    await expect(
      clientCredentialsOidcHandler.handle({
        ...standardOidcOptions,
        client,
      }),
    ).rejects.toThrow("Bad audience");
  });

  it("builds a fetch authenticated with a DPoP token if appropriate", async () => {
    const client = mockStaticClient();
    const tokens = await mockDpopTokens(client.clientId);
    setupTokenEndpointMock(tokens);
    setupGetWebidMock("https://my.webid/", "some client ID");
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockDefaultTokenRefresher(),
    );
    const result = await clientCredentialsOidcHandler.handle({
      ...standardOidcOptions,
      dpop: true,
      client,
    });

    // The token request is DPoP-bound.
    const tokenRequest = getTokenRequest();
    const dpopProof = tokenRequest.headers.get("DPoP");
    expect(dpopProof).not.toBeNull();
    expect(decodeProtectedHeader(dpopProof as string)).toMatchObject({
      typ: "dpop+jwt",
      alg: "ES256",
    });
    expect(decodeJwt(dpopProof as string)).toMatchObject({
      htm: "POST",
      htu: standardOidcOptions.issuerConfiguration.tokenEndpoint,
    });

    mockedFetch.mockResolvedValue(
      new Response(undefined, {
        status: 200,
      }),
    );
    await result?.fetch("https://some.pod/resource");
    expect(mockedFetch).toHaveBeenCalledTimes(2);
    const headers = new Headers(mockedFetch.mock.calls[1][1]?.headers);
    expect(headers.get("Authorization")).toContain(
      `DPoP ${tokens.access_token}`,
    );
  });

  it("builds a fetch authenticated with a Bearer token if appropriate", async () => {
    const client = mockStaticClient();
    const tokens = await mockBearerTokens(client.clientId);
    setupTokenEndpointMock(tokens);
    setupGetWebidMock("https://my.webid/", "some client ID");
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockDefaultTokenRefresher(),
    );
    const result = await clientCredentialsOidcHandler.handle({
      ...standardOidcOptions,
      dpop: false,
      client,
    });

    // The token request is not DPoP-bound.
    expect(getTokenRequest().headers.has("DPoP")).toBe(false);

    mockedFetch.mockResolvedValue(
      new Response(undefined, {
        status: 200,
      }),
    );
    await result?.fetch("https://some.pod/resource");
    expect(mockedFetch).toHaveBeenCalledTimes(2);
    const headers = new Headers(mockedFetch.mock.calls[1][1]?.headers);
    expect(headers.get("Authorization")).toContain(
      `Bearer ${tokens.access_token}`,
    );
  });

  it("builds a fetch authenticated handling the refresh flow if appropriate", async () => {
    const client = mockStaticClient();
    const tokens = await mockDpopTokens(client.clientId);
    tokens.refresh_token = "some refresh token";
    setupTokenEndpointMock(tokens);
    setupGetWebidMock("https://my.webid/", "some client ID");
    const coreModule = jest.requireMock(
      "@inrupt/solid-client-authn-core",
    ) as typeof SolidClientAuthnCore;
    const mockAuthenticatedFetchBuild = jest.spyOn(
      coreModule,
      "buildAuthenticatedFetch",
    );
    const mockedRefresher = mockDefaultTokenRefresher();
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockedRefresher,
    );
    await clientCredentialsOidcHandler.handle({
      ...standardOidcOptions,
      dpop: true,
      client,
    });

    expect(mockAuthenticatedFetchBuild).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        refreshOptions: {
          refreshToken: "some refresh token",
          sessionId: "mySession",
          tokenRefresher: mockedRefresher,
        },
      }),
    );
  });

  it("builds a fetch authenticated including the expiration value if present", async () => {
    const client = mockStaticClient();
    setupTokenEndpointMock(await mockDpopTokens(client.clientId));
    setupGetWebidMock("https://my.webid/", "some client ID");
    const coreModule = jest.requireMock(
      "@inrupt/solid-client-authn-core",
    ) as typeof SolidClientAuthnCore;
    const mockAuthenticatedFetchBuild = jest.spyOn(
      coreModule,
      "buildAuthenticatedFetch",
    );
    const mockedRefresher = mockDefaultTokenRefresher();
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockedRefresher,
    );
    await clientCredentialsOidcHandler.handle({
      ...standardOidcOptions,
      dpop: true,
      client,
    });

    expect(mockAuthenticatedFetchBuild).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        expiresIn: DEFAULT_EXPIRATION_TIME_SECONDS,
      }),
    );
  });

  it("returns session info with the built fetch", async () => {
    const client = mockStaticClient();
    setupTokenEndpointMock(await mockDpopTokens(client.clientId));
    setupGetWebidMock("https://my.webid/");
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockDefaultTokenRefresher(),
    );
    const result = await clientCredentialsOidcHandler.handle({
      ...standardOidcOptions,
      dpop: true,
      client,
    });

    expect(result?.isLoggedIn).toBe(true);
    expect(result?.sessionId).toBe(standardOidcOptions.sessionId);
    expect(result?.webId).toBe("https://my.webid/");
    expect(result?.expirationDate).toBe(
      Date.now() + DEFAULT_EXPIRATION_TIME_SECONDS * 1000,
    );
  });

  it("does not set an expiration date if the issuer does not return one", async () => {
    const client = mockStaticClient();
    const tokens = await mockDpopTokens(client.clientId);
    tokens.expires_in = undefined;
    setupTokenEndpointMock(tokens);
    setupGetWebidMock("https://my.webid/");
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockDefaultTokenRefresher(),
    );
    const result = await clientCredentialsOidcHandler.handle({
      ...standardOidcOptions,
      dpop: true,
      client,
    });

    expect(result?.isLoggedIn).toBe(true);
    expect(result?.expirationDate).toBeUndefined();
  });

  it("calls the token set handler if one is provided", async () => {
    const client = mockStaticClient();
    const tokens = await mockDpopTokens(client.clientId);
    setupTokenEndpointMock(tokens);
    setupGetWebidMock("https://my.webid/");
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockDefaultTokenRefresher(),
    );
    const mockEmitter = new EventEmitter();
    const mockEmit = jest.spyOn(mockEmitter, "emit");

    await clientCredentialsOidcHandler.handle({
      ...standardOidcOptions,
      dpop: true,
      client,
      eventEmitter: mockEmitter,
    });

    expect(mockEmit).toHaveBeenCalledWith(
      EVENTS.NEW_TOKENS,
      expect.objectContaining({
        accessToken: tokens.access_token,
        idToken: tokens.id_token,
        refreshToken: undefined,
        webId: "https://my.webid/",
        expiresAt: Date.now() + DEFAULT_EXPIRATION_TIME_SECONDS * 1000,
        dpopKey: expect.anything(),
        clientId: client.clientId,
        issuer: standardOidcOptions.issuer,
      }),
    );
  });

  it("returns session info, including clientAppId, with the built fetch", async () => {
    const client = mockStaticClient("some client ID");
    setupTokenEndpointMock(await mockDpopTokens(client.clientId));
    setupGetWebidMock("https://my.webid/", "some client ID");
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockDefaultTokenRefresher(),
    );
    const result = await clientCredentialsOidcHandler.handle({
      ...standardOidcOptions,
      dpop: true,
      client,
    });
    expect(result?.isLoggedIn).toBe(true);
    expect(result?.sessionId).toBe(standardOidcOptions.sessionId);
    expect(result?.webId).toBe("https://my.webid/");
    expect(result?.clientAppId).toBe("some client ID");
    expect(result?.expirationDate).toBe(
      Date.now() + DEFAULT_EXPIRATION_TIME_SECONDS * 1000,
    );
  });

  it("uses the provided scopes in the token request", async () => {
    const client = mockStaticClient();
    setupTokenEndpointMock(await mockBearerTokens(client.clientId));
    setupGetWebidMock("https://my.webid/");
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockDefaultTokenRefresher(),
    );
    await clientCredentialsOidcHandler.handle({
      ...standardOidcOptions,
      dpop: false,
      client,
      scopes: ["openid", "webid", "custom_scope"],
    });

    const request = getTokenRequest();
    expect(request.body.get("grant_type")).toBe("client_credentials");
    // The scopes are space-separated.
    expect(request.body.get("scope")).toBe("openid webid custom_scope");
    expect(request.headers.has("DPoP")).toBe(false);
  });

  // The next test is skipped because the fake timers currently don't work
  // with the background refresh.
  it.skip("does not setup session refresh if keepAlive is false", async () => {
    // Mock timers to trigger token refresh.
    jest.useFakeTimers();
    setupTokenEndpointMock(await mockDpopTokens("some client ID"));
    const mockedRefresher = mockDefaultTokenRefresher();
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockedRefresher,
    );
    await clientCredentialsOidcHandler.handle({
      ...standardOidcOptions,
      dpop: true,
      keepAlive: false,
      client: mockStaticClient("some client ID"),
    });
    jest.advanceTimersByTime(500000);
    // This would pass, but simply because the timers don't work
    // properly, so it is NOT a functional test.
    expect(mockedRefresher.refresh).not.toHaveBeenCalled();
  });
});
