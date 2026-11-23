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
import {
  StorageUtilityMock,
  mockStorageUtility,
  EVENTS,
  getWebidFromTokenPayload,
} from "@inrupt/solid-client-authn-core";
import { EventEmitter } from "events";
import { AuthCodeRedirectHandler } from "./AuthCodeRedirectHandler";
import { mockSessionInfoManager } from "../../../sessionInfo/__mocks__/SessionInfoManager";
import {
  mockIssuerConfigFetcher,
  mockDefaultIssuerConfig,
  mockIssuerConfig,
} from "../__mocks__/IssuerConfigFetcher";
import {
  mockDefaultClient,
  mockDefaultClientRegistrar,
} from "../__mocks__/ClientRegistrar";
import { mockDefaultTokenRefresher } from "../refresh/__mocks__/TokenRefresher";

// Camelcase identifiers are required in the OIDC specification.
/* eslint-disable camelcase*/

jest.mock("@inrupt/solid-client-authn-core", () => {
  const actualCoreModule = jest.requireActual(
    "@inrupt/solid-client-authn-core",
  ) as any;
  return {
    ...actualCoreModule,
    // This works around the network lookup to the JWKS in order to validate
    // the ID token signature (openid-client only validates the claims).
    getWebidFromTokenPayload: jest.fn(() =>
      Promise.resolve({ webId: "https://my.webid/", clientId: "some client" }),
    ),
  };
});
jest.useFakeTimers();
const DEFAULT_EXPIRATION_TIME_SECONDS = 300;

const mockWebId = (): string => "https://my.webid/";

const base64UrlJson = (value: unknown): string =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

// openid-client validates the ID token claims and its header algorithm, but
// not its signature, so a dummy signature is sufficient here.
const mockIdToken = (
  claims: Record<string, unknown> = {},
  alg = "RS256",
): string => {
  const now = Math.trunc(Date.now() / 1000);
  return [
    base64UrlJson({ alg, typ: "JWT" }),
    base64UrlJson({
      sub: mockWebId(),
      iss: mockDefaultIssuerConfig().issuer,
      aud: mockDefaultClient().clientId,
      iat: now,
      exp: now + DEFAULT_EXPIRATION_TIME_SECONDS,
      ...claims,
    }),
    "c2lnbmF0dXJl",
  ].join(".");
};

const mockBearerAccessToken = (): string => "some token";
const mockDpopAccessToken = (): string => "some DPoP-bound token";

type TokenResponse = {
  access_token?: string;
  id_token?: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
};

const mockBearerTokens = (): TokenResponse => ({
  access_token: mockBearerAccessToken(),
  id_token: mockIdToken(),
  token_type: "Bearer",
  expires_in: DEFAULT_EXPIRATION_TIME_SECONDS,
});

const mockDpopTokens = (): TokenResponse => ({
  access_token: mockDpopAccessToken(),
  id_token: mockIdToken(),
  token_type: "DPoP",
  expires_in: DEFAULT_EXPIRATION_TIME_SECONDS,
});

const mockTokenEndpointResponse = (
  body: Record<string, unknown>,
  status = 200,
): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const mockFetch = () => jest.spyOn(globalThis, "fetch");

/**
 * Mocks the token endpoint response, and returns the fetch spy.
 */
const setupTokenEndpoint = (tokens: TokenResponse = mockDpopTokens()) => {
  const fetchSpy = mockFetch();
  fetchSpy.mockResolvedValueOnce(mockTokenEndpointResponse(tokens));
  return fetchSpy;
};

const getTokenRequest = (fetchSpy: ReturnType<typeof mockFetch>) => {
  const tokenCall = fetchSpy.mock.calls.find(
    ([url]) => url.toString() === mockDefaultIssuerConfig().tokenEndpoint,
  );
  if (tokenCall === undefined) {
    throw new Error("No request was sent to the token endpoint");
  }
  const [url, init] = tokenCall;
  return {
    url: url.toString(),
    method: init?.method,
    headers: new Headers(init?.headers),
    body: new URLSearchParams(init?.body as URLSearchParams),
  };
};

const formUrlEncode = (value: string) =>
  encodeURIComponent(value).replace(/%20/g, "+");

const defaultMocks = {
  storageUtility: StorageUtilityMock,
  sessionInfoManager: mockSessionInfoManager(mockStorageUtility({})),
  clientRegistrar: mockDefaultClientRegistrar(),
  issuerConfigFetcher: mockIssuerConfigFetcher(mockDefaultIssuerConfig()),
  tokenRefresher: mockDefaultTokenRefresher(),
};

function getAuthCodeRedirectHandler(
  mocks: Partial<typeof defaultMocks> = defaultMocks,
): AuthCodeRedirectHandler {
  return new AuthCodeRedirectHandler(
    mocks.storageUtility ?? defaultMocks.storageUtility,
    mocks.sessionInfoManager ?? defaultMocks.sessionInfoManager,
    mocks.issuerConfigFetcher ?? defaultMocks.issuerConfigFetcher,
    mocks.clientRegistrar ?? defaultMocks.clientRegistrar,
    mocks.tokenRefresher ?? defaultMocks.tokenRefresher,
  );
}

describe("AuthCodeRedirectHandler", () => {
  beforeEach(() => {
    // Restores the global fetch spied upon by previous tests.
    jest.restoreAllMocks();
  });

  describe("canHandler", () => {
    it("Accepts a valid url with the correct query", async () => {
      const authCodeRedirectHandler = getAuthCodeRedirectHandler();
      expect(
        await authCodeRedirectHandler.canHandle(
          "https://coolparty.com/?code=someCode&state=oauth2_state_value",
        ),
      ).toBe(true);
    });

    it("throws on invalid url", async () => {
      const authCodeRedirectHandler = getAuthCodeRedirectHandler();
      await expect(() =>
        authCodeRedirectHandler.canHandle("beep boop I am a robot"),
      ).rejects.toThrow(
        "[beep boop I am a robot] is not a valid URL, and cannot be used as a redirect URL",
      );
    });

    it("Rejects a valid url with the incorrect query", async () => {
      const authCodeRedirectHandler = getAuthCodeRedirectHandler();
      expect(
        await authCodeRedirectHandler.canHandle(
          "https://coolparty.com/?meep=mop",
        ),
      ).toBe(false);
    });

    it("rejects a valid url without authorization code", async () => {
      const authCodeRedirectHandler = getAuthCodeRedirectHandler();
      expect(
        await authCodeRedirectHandler.canHandle(
          "https://coolparty.com/?state=someState",
        ),
      ).toBe(false);
    });

    it("rejects a valid url without state", async () => {
      const authCodeRedirectHandler = getAuthCodeRedirectHandler();
      expect(
        await authCodeRedirectHandler.canHandle(
          "https://coolparty.com/?code=someCode",
        ),
      ).toBe(false);
    });
  });

  const mockDefaultRedirectStorage = () =>
    mockStorageUtility({
      "solidClientAuthenticationUser:someState": {
        sessionId: "mySession",
      },
      "solidClientAuthenticationUser:mySession": {
        issuer: "https://my.idp/",
        codeVerifier: "some code verifier",
        redirectUrl: "https://my.app/redirect",
        dpop: "true",
        idTokenSignedResponseAlg: "RS256",
      },
    });

  const getDefaultHandler = (
    mocks: Partial<typeof defaultMocks> = {},
    storage = mockDefaultRedirectStorage(),
  ) =>
    getAuthCodeRedirectHandler({
      storageUtility: storage,
      sessionInfoManager: mockSessionInfoManager(storage),
      ...mocks,
    });

  describe("handle", () => {
    it("throws on non-redirect URL", async () => {
      const authCodeRedirectHandler = getAuthCodeRedirectHandler();
      await expect(
        authCodeRedirectHandler.handle("https://my.app"),
      ).rejects.toThrow(
        "AuthCodeRedirectHandler cannot handle [https://my.app]: it is missing one of [code, state].",
      );
    });

    it("sets the correct session information", async () => {
      setupTokenEndpoint();
      const authCodeRedirectHandler = getDefaultHandler();

      const result = await authCodeRedirectHandler.handle(
        "https://my.app/redirect?code=someCode&state=someState",
      );

      // Check that the returned session is the one we expected
      expect(result.sessionId).toBe("mySession");
      expect(result.isLoggedIn).toBe(true);
      expect(result.webId).toEqual(mockWebId());
      // The expiration date is expressed in milliseconds since epoch.
      expect(result.expirationDate).toEqual(
        Date.now() + DEFAULT_EXPIRATION_TIME_SECONDS * 1000,
      );
    });

    it("does not set an expiration date if the IdP does not return expires_in", async () => {
      const tokens = mockDpopTokens();
      delete tokens.expires_in;
      setupTokenEndpoint(tokens);
      const mockEmitter = new EventEmitter();
      const mockEmit = jest.spyOn(mockEmitter, "emit");

      const result = await getDefaultHandler().handle(
        "https://my.app/redirect?code=someCode&state=someState",
        mockEmitter,
      );

      expect(result.expirationDate).toBeUndefined();
      expect(mockEmit).toHaveBeenCalledWith(
        EVENTS.NEW_TOKENS,
        expect.objectContaining({ expiresAt: undefined }),
      );
    });

    it("validates the ID token signature using the issuer JWKS", async () => {
      setupTokenEndpoint();

      await getDefaultHandler().handle(
        "https://my.app/redirect?code=someCode&state=someState",
      );

      expect(getWebidFromTokenPayload).toHaveBeenCalledWith(
        mockIdToken(),
        mockDefaultIssuerConfig().jwksUri,
        mockDefaultIssuerConfig().issuer,
        mockDefaultClient().clientId,
      );
    });

    it("throws if the issuer configuration has no JWKS URI", async () => {
      const fetchSpy = setupTokenEndpoint();
      const authCodeRedirectHandler = getDefaultHandler({
        issuerConfigFetcher: mockIssuerConfigFetcher(
          mockIssuerConfig({ jwksUri: undefined }),
        ),
      });

      await expect(
        authCodeRedirectHandler.handle(
          "https://my.app/redirect?code=someCode&state=someState",
        ),
      ).rejects.toThrow(
        "JWKS URI is missing from issuer configuration, cannot validate tokens",
      );
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("properly performs DPoP token exchange", async () => {
      const fetchSpy = setupTokenEndpoint();
      const mockedStorage = mockDefaultRedirectStorage();
      const authCodeRedirectHandler = getDefaultHandler({}, mockedStorage);

      const result = await authCodeRedirectHandler.handle(
        "https://my.app/redirect?code=someCode&state=someState",
      );

      // The token request is DPoP-bound.
      const tokenRequest = getTokenRequest(fetchSpy);
      expect(tokenRequest.headers.get("DPoP")).toEqual(expect.any(String));

      // Check that the session information is stored in the provided storage
      await expect(
        mockedStorage.getForUser("mySession", "webId"),
      ).resolves.toEqual(mockWebId());
      await expect(
        mockedStorage.getForUser("mySession", "isLoggedIn"),
      ).resolves.toBe("true");

      // Check that the returned fetch function is authenticated
      fetchSpy.mockResolvedValueOnce(new Response());
      await result.fetch("https://some.url");
      const headers = new Headers(fetchSpy.mock.calls.at(-1)?.[1]?.headers);
      expect(headers.get("Authorization")).toBe(
        `DPoP ${mockDpopAccessToken()}`,
      );
      expect(headers.get("DPoP")).toEqual(expect.any(String));
    });

    it("sends the expected token request, authenticating confidential clients with HTTP Basic", async () => {
      const fetchSpy = setupTokenEndpoint();

      await getDefaultHandler().handle(
        "https://my.app/redirect?code=someCode&state=someState",
      );

      const tokenRequest = getTokenRequest(fetchSpy);
      expect(tokenRequest.method).toBe("POST");
      expect(tokenRequest.body.get("grant_type")).toBe("authorization_code");
      expect(tokenRequest.body.get("code")).toBe("someCode");
      // The code verifier comes from the mocked storage.
      expect(tokenRequest.body.get("code_verifier")).toBe("some code verifier");
      expect(tokenRequest.body.get("redirect_uri")).toBe(
        "https://my.app/redirect",
      );
      const { clientId, clientSecret } = mockDefaultClient();
      expect(tokenRequest.headers.get("Authorization")).toBe(
        `Basic ${Buffer.from(
          `${formUrlEncode(clientId)}:${formUrlEncode(clientSecret as string)}`,
        ).toString("base64")}`,
      );
      expect(tokenRequest.body.get("client_secret")).toBeNull();
    });

    it("uses 'none' client authentication if using Solid-OIDC client identifiers", async () => {
      const clientId = "https://some.client.identifier";
      const fetchSpy = setupTokenEndpoint({
        ...mockDpopTokens(),
        id_token: mockIdToken({ aud: clientId }),
      });

      const authCodeRedirectHandler = getDefaultHandler({
        clientRegistrar: {
          getClient: async () => {
            return {
              clientId,
              clientType: "solid-oidc",
            };
          },
        },
      });

      await authCodeRedirectHandler.handle(
        "https://my.app/redirect?code=someCode&state=someState",
      );

      const tokenRequest = getTokenRequest(fetchSpy);
      expect(tokenRequest.headers.get("Authorization")).toBeNull();
      expect(tokenRequest.body.get("client_id")).toBe(clientId);
      expect(tokenRequest.body.get("client_secret")).toBeNull();
    });

    it("rejects ID tokens not signed with the client's expected algorithm", async () => {
      setupTokenEndpoint({
        ...mockDpopTokens(),
        id_token: mockIdToken({}, "ES256"),
      });

      await expect(
        getDefaultHandler({
          clientRegistrar: {
            getClient: async () => ({
              ...mockDefaultClient(),
              idTokenSignedResponseAlg: "RS256",
            }),
          },
        }).handle("https://my.app/redirect?code=someCode&state=someState"),
      ).rejects.toThrow();
      expect(getWebidFromTokenPayload).not.toHaveBeenCalled();
    });

    it("accepts ID tokens signed with the client's expected algorithm", async () => {
      setupTokenEndpoint({
        ...mockDpopTokens(),
        id_token: mockIdToken({}, "ES256"),
      });

      await expect(
        getDefaultHandler({
          clientRegistrar: {
            getClient: async () => ({
              ...mockDefaultClient(),
              idTokenSignedResponseAlg: "ES256",
            }),
          },
        }).handle("https://my.app/redirect?code=someCode&state=someState"),
      ).resolves.toBeDefined();
    });

    it("rejects ID tokens signed with an algorithm the issuer does not support if the client has no expected algorithm", async () => {
      // The default issuer configuration supports ES256 and RS256.
      setupTokenEndpoint({
        ...mockDpopTokens(),
        id_token: mockIdToken({}, "PS256"),
      });

      await expect(
        getDefaultHandler().handle(
          "https://my.app/redirect?code=someCode&state=someState",
        ),
      ).rejects.toThrow();
      expect(getWebidFromTokenPayload).not.toHaveBeenCalled();
    });

    it("throws if the ID token audience does not include the client ID", async () => {
      setupTokenEndpoint({
        ...mockDpopTokens(),
        id_token: mockIdToken({ aud: "https://some.other.client" }),
      });

      await expect(
        getDefaultHandler().handle(
          "https://my.app/redirect?code=someCode&state=someState",
        ),
      ).rejects.toThrow();
      expect(getWebidFromTokenPayload).not.toHaveBeenCalled();
    });

    it("throws if the ID token issuer does not match the issuer", async () => {
      setupTokenEndpoint({
        ...mockDpopTokens(),
        id_token: mockIdToken({ iss: "https://some.other.idp/" }),
      });

      await expect(
        getDefaultHandler().handle(
          "https://my.app/redirect?code=someCode&state=someState",
        ),
      ).rejects.toThrow();
      expect(getWebidFromTokenPayload).not.toHaveBeenCalled();
    });

    it("properly performs Bearer token exchange", async () => {
      const fetchSpy = setupTokenEndpoint(mockBearerTokens());
      const mockedStorage = mockDefaultRedirectStorage();
      await mockedStorage.setForUser("mySession", {
        dpop: "false",
      });

      const result = await getDefaultHandler({}, mockedStorage).handle(
        "https://my.app/redirect?code=someCode&state=someState",
      );

      // The token request is not DPoP-bound.
      expect(getTokenRequest(fetchSpy).headers.get("DPoP")).toBeNull();

      // Check that the returned fetch function is authenticated
      fetchSpy.mockResolvedValueOnce(new Response());
      await result.fetch("https://some.url");
      const headers = new Headers(fetchSpy.mock.calls.at(-1)?.[1]?.headers);
      expect(headers.get("Authorization")).toBe(
        `Bearer ${mockBearerAccessToken()}`,
      );
    });

    it("cleans up the redirect IRI from the OIDC parameters", async () => {
      const fetchSpy = setupTokenEndpoint();

      await getDefaultHandler().handle(
        `https://my.app/redirect?code=someCode&state=someState&iss=${encodeURIComponent(
          mockDefaultIssuerConfig().issuer,
        )}`,
      );

      const tokenRequest = getTokenRequest(fetchSpy);
      expect(tokenRequest.body.get("redirect_uri")).toBe(
        "https://my.app/redirect",
      );
      expect(tokenRequest.body.get("code")).toBe("someCode");
      expect(tokenRequest.body.get("code_verifier")).toBe("some code verifier");
    });

    it("preserves the redirect IRI query parameters, but not its fragment", async () => {
      // Query parameters are allowed in redirect URIs, but fragments aren't
      // (RFC 6749, section 3.1.2).
      const fetchSpy = setupTokenEndpoint();

      await getDefaultHandler().handle(
        `https://my.app/redirect?someParam=someValue&code=someCode&state=someState&iss=${encodeURIComponent(
          mockDefaultIssuerConfig().issuer,
        )}#someHash`,
      );

      const tokenRequest = getTokenRequest(fetchSpy);
      expect(tokenRequest.body.get("redirect_uri")).toBe(
        "https://my.app/redirect?someParam=someValue",
      );
      expect(tokenRequest.body.get("code")).toBe("someCode");
    });

    it("stores the refresh token if one is returned", async () => {
      setupTokenEndpoint({
        ...mockDpopTokens(),
        refresh_token: "some refresh token",
      });
      const mockedStorage = mockDefaultRedirectStorage();

      await getDefaultHandler({}, mockedStorage).handle(
        "https://my.app/redirect?code=someCode&state=someState",
      );

      // Check that the session information is stored in the provided storage
      await expect(
        mockedStorage.getForUser("mySession", "refreshToken"),
      ).resolves.toBe("some refresh token");
    });

    it("stores the DPoP key pair if the refresh token is DPoP-bound", async () => {
      setupTokenEndpoint({
        ...mockDpopTokens(),
        refresh_token: "some refresh token",
      });
      const mockedStorage = mockDefaultRedirectStorage();

      await getDefaultHandler({}, mockedStorage).handle(
        "https://my.app/redirect?code=someCode&state=someState",
      );

      // Check that the session information is stored in the provided storage
      await expect(
        mockedStorage.getForUser("mySession", "privateKey"),
      ).resolves.toBeDefined();
      await expect(
        mockedStorage.getForUser("mySession", "publicKey"),
      ).resolves.toBeDefined();
    });

    it("calls the refresh token handler if one is provided", async () => {
      setupTokenEndpoint({
        ...mockDpopTokens(),
        refresh_token: "some refresh token",
      });
      const mockEmitter = new EventEmitter();
      const mockEmit = jest.spyOn(mockEmitter, "emit");

      await getDefaultHandler().handle(
        "https://my.app/redirect?code=someCode&state=someState",
        mockEmitter,
      );

      expect(mockEmit).toHaveBeenCalledWith(
        EVENTS.NEW_REFRESH_TOKEN,
        "some refresh token",
      );
    });

    it("sets up refreshing the tokens if keepAlive is enabled", async () => {
      const fetchSpy = setupTokenEndpoint({
        ...mockDpopTokens(),
        refresh_token: "some refresh token",
      });
      const mockedStorage = mockDefaultRedirectStorage();
      await mockedStorage.setForUser("mySession", { keepAlive: "true" });
      const tokenRefresher = mockDefaultTokenRefresher();

      await getDefaultHandler({ tokenRefresher }, mockedStorage).handle(
        "https://my.app/redirect?code=someCode&state=someState",
        new EventEmitter(),
      );
      // The refresh is scheduled shortly before the access token expires.
      await jest.advanceTimersByTimeAsync(
        DEFAULT_EXPIRATION_TIME_SECONDS * 1000,
      );

      expect(tokenRefresher.refresh).toHaveBeenCalledWith(
        "mySession",
        "some refresh token",
        // The refresh is DPoP-bound to the same key as the initial tokens.
        expect.objectContaining({
          privateKey: expect.anything(),
          publicKey: expect.anything(),
        }),
      );
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("does not refresh the tokens if keepAlive is disabled", async () => {
      setupTokenEndpoint({
        ...mockDpopTokens(),
        refresh_token: "some refresh token",
      });
      const mockedStorage = mockDefaultRedirectStorage();
      await mockedStorage.setForUser("mySession", { keepAlive: "false" });
      const tokenRefresher = mockDefaultTokenRefresher();

      await getDefaultHandler({ tokenRefresher }, mockedStorage).handle(
        "https://my.app/redirect?code=someCode&state=someState",
        new EventEmitter(),
      );
      await jest.advanceTimersByTimeAsync(
        DEFAULT_EXPIRATION_TIME_SECONDS * 1000,
      );

      expect(tokenRefresher.refresh).not.toHaveBeenCalled();
    });

    it("calls the token set handler if one is provided", async () => {
      const mockedTokens = {
        ...mockDpopTokens(),
        refresh_token: "some refresh token",
      };
      setupTokenEndpoint(mockedTokens);
      const mockEmitter = new EventEmitter();
      const mockEmit = jest.spyOn(mockEmitter, "emit");

      await getDefaultHandler().handle(
        "https://my.app/redirect?code=someCode&state=someState",
        mockEmitter,
      );

      expect(mockEmit).toHaveBeenCalledWith(
        EVENTS.NEW_TOKENS,
        expect.objectContaining({
          accessToken: mockedTokens.access_token,
          idToken: mockedTokens.id_token,
          refreshToken: mockedTokens.refresh_token,
          webId: "https://my.webid/",
          // expiresAt is expressed in seconds since epoch.
          expiresAt:
            Math.trunc(Date.now() / 1000) + DEFAULT_EXPIRATION_TIME_SECONDS,
          dpopKey: expect.anything(),
          clientId: mockDefaultClient().clientId,
          issuer: mockDefaultIssuerConfig().issuer,
        }),
      );
    });

    it("throws if the iss parameter does not match stored issuer", async () => {
      const fetchSpy = setupTokenEndpoint();

      // openid-client throws if the iss parameter mismatches.
      await expect(
        getDefaultHandler().handle(
          "https://my.app/redirect?code=someCode&state=someState&iss=someIssuer",
        ),
      ).rejects.toThrow();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("throws if the IdP returns an error", async () => {
      mockFetch().mockResolvedValueOnce(
        mockTokenEndpointResponse({ error: "invalid_grant" }, 400),
      );

      await expect(
        getDefaultHandler().handle(
          "https://my.app/redirect?code=someCode&state=someState",
        ),
      ).rejects.toThrow();
    });

    it("throws if the IdP does not return an access token", async () => {
      const tokens = mockDpopTokens();
      delete tokens.access_token;
      setupTokenEndpoint(tokens);

      // openid-client rejects token responses without an access token.
      await expect(
        getDefaultHandler().handle(
          "https://my.app/redirect?code=someCode&state=someState",
        ),
      ).rejects.toMatchObject({
        cause: expect.objectContaining({
          message: expect.stringContaining("access_token"),
        }),
      });
    });

    it("throws if the IdP does not return an ID token", async () => {
      const tokens = mockDpopTokens();
      delete tokens.id_token;
      setupTokenEndpoint(tokens);

      await expect(
        getDefaultHandler().handle(
          "https://my.app/redirect?code=someCode&state=someState",
        ),
      ).rejects.toThrow(
        `The Identity Provider [${
          mockDefaultIssuerConfig().issuer
        }] did not return the expected tokens: missing at least one of 'access_token', 'id_token'.`,
      );
    });

    it("throws if the Session manager cannot retrieve the session info", async () => {
      setupTokenEndpoint();
      const mockedStorage = mockDefaultRedirectStorage();
      const mockedSessionManager = mockSessionInfoManager(mockedStorage);
      mockedSessionManager.get = jest
        .fn()
        .mockReturnValue(undefined) as typeof mockedSessionManager.get;

      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockedStorage,
        sessionInfoManager: mockedSessionManager,
      });

      await expect(
        authCodeRedirectHandler.handle(
          "https://my.app/redirect?code=someCode&state=someState",
        ),
      ).rejects.toThrow(
        "Could not find any session information associated with SessionID [mySession] in our storage",
      );
    });

    it("throws if no session ID matches the request state", async () => {
      const fetchSpy = setupTokenEndpoint();
      const mockedStorage = mockStorageUtility({});

      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockedStorage,
      });

      await expect(
        authCodeRedirectHandler.handle(
          "https://my.app/redirect?code=someCode&state=someState",
        ),
      ).rejects.toThrow(
        "No stored session is associated with the state [someState]",
      );
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
