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
import {
  StorageUtilityMock,
  mockStorageUtility,
  EVENTS,
} from "@inrupt/solid-client-authn-core";
import type { IdTokenClaims, TokenSet, BaseClient } from "openid-client";
import type { JWK } from "jose";
import {
  Response as NodeResponse,
  Headers as NodeHeaders,
} from "@inrupt/universal-fetch";
import type * as UniversalFetch from "@inrupt/universal-fetch";
import { EventEmitter } from "events";
import { AuthCodeRedirectHandler } from "./AuthCodeRedirectHandler";
import { mockSessionInfoManager } from "../../../sessionInfo/__mocks__/SessionInfoManager";
import {
  mockIssuerConfigFetcher,
  mockDefaultIssuerConfig,
} from "../__mocks__/IssuerConfigFetcher";
import { mockDefaultClientRegistrar } from "../__mocks__/ClientRegistrar";
import { mockDefaultTokenRefresher } from "../refresh/__mocks__/TokenRefresher";
import { configToIssuerMetadata } from "../IssuerConfigFetcher";

jest.mock("openid-client");
// The fetch factory in the core module resolves @inrupt/universal-fetch to the environment-specific fetch

jest.mock("@inrupt/universal-fetch", () => {
  return {
    ...(jest.requireActual("@inrupt/universal-fetch") as typeof UniversalFetch),
    default: jest.fn<typeof fetch>(),
    fetch: jest.fn<typeof fetch>(),
  };
});

jest.mock("@inrupt/solid-client-authn-core", () => {
  const actualCoreModule = jest.requireActual(
    "@inrupt/solid-client-authn-core",
  ) as any;
  return {
    ...actualCoreModule,
    // This works around the network lookup to the JWKS in order to validate the ID token.
    getWebidFromTokenPayload: jest.fn(() =>
      Promise.resolve("https://my.webid/"),
    ),
  };
});
jest.useFakeTimers();
const DEFAULT_EXPIRATION_TIME_SECONDS = 300;

const mockJwk = (): JWK => {
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

const mockWebId = (): string => "https://my.webid/";

const mockIdTokenPayload = (): IdTokenClaims => {
  return {
    sub: "https://my.webid",
    iss: "https://my.idp/",
    aud: "https://resource.example.org",
    exp: 1662266216,
    iat: 1462266216,
  };
};
// The key is the one returned by mockJwk(), and the payload is mockIdTokenPayload()
const mockIdToken = (): string =>
  "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJodHRwczovL215LndlYmlkIiwiaXNzIjoiaHR0cHM6Ly9teS5pZHAvIiwiYXVkIjoiaHR0cHM6Ly9yZXNvdXJjZS5leGFtcGxlLm9yZyIsImV4cCI6MTY2MjI2NjIxNiwiaWF0IjoxNDYyMjY2MjE2fQ.IwumuwJtQw5kUBMMHAaDPJBppfBpRHbiXZw_HlKe6GNVUWUlyQRYV7W7r9OQtHmMsi6GVwOckelA3ErmhrTGVw";

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

const mockKeyBoundToken = async (): Promise<AccessJwt> => {
  return {
    sub: mockWebId(),
    iss: mockDefaultIssuerConfig().issuer.toString(),
    aud: "https://resource.example.org",
    nbf: 1562262611,
    exp: 1562266216,
    cnf: {
      jkt: mockJwk().kid as string,
    },
  };
};

const mockBearerAccessToken = (): string => "some token";

const mockBearerTokens = (): TokenSet => {
  return {
    access_token: mockBearerAccessToken(),
    id_token: mockIdToken(),
    token_type: "Bearer",
    expired: () => false,
    claims: mockIdTokenPayload,
    expires_in: DEFAULT_EXPIRATION_TIME_SECONDS,
  };
};

const mockDpopTokens = (): TokenSet => {
  return {
    access_token: JSON.stringify(mockKeyBoundToken()),
    id_token: mockIdToken(),
    token_type: "DPoP",
    expired: () => false,
    claims: mockIdTokenPayload,
    expires_in: DEFAULT_EXPIRATION_TIME_SECONDS,
  };
};

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

  const setupOidcClientMock = (tokenSet?: TokenSet, callback?: unknown) => {
    const { Issuer } = jest.requireMock("openid-client") as any;
    const mockedIssuer = {
      metadata: configToIssuerMetadata(mockDefaultIssuerConfig()),
      Client: jest.fn().mockReturnValue({
        callbackParams: jest.fn().mockReturnValue({
          code: "someCode",
          state: "someState",
        }),
        callback:
          callback ??
          jest
            .fn<BaseClient["callback"]>()
            .mockResolvedValue(tokenSet ?? mockDpopTokens()),
        metadata: {
          client_id: "https://some.client#id",
        },
      }),
    };
    Issuer.mockReturnValueOnce(mockedIssuer);
    return mockedIssuer;
  };

  const setupDefaultOidcClientMock = () =>
    setupOidcClientMock(mockDpopTokens());

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
      setupDefaultOidcClientMock();
      const mockedStorage = mockDefaultRedirectStorage();

      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockedStorage,
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });

      const result = await authCodeRedirectHandler.handle(
        "https://my.app/redirect?code=someCode&state=someState",
      );

      // Check that the returned session is the one we expected
      expect(result.sessionId).toBe("mySession");
      expect(result.isLoggedIn).toBe(true);
      expect(result.webId).toEqual(mockWebId());
      expect(result.expirationDate).toEqual(
        Date.now() + DEFAULT_EXPIRATION_TIME_SECONDS * 1000,
      );
    });

    it("properly performs DPoP token exchange", async () => {
      setupDefaultOidcClientMock();
      const mockedStorage = mockDefaultRedirectStorage();

      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockedStorage,
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });

      const result = await authCodeRedirectHandler.handle(
        "https://my.app/redirect?code=someCode&state=someState",
      );

      // Check that the session information is stored in the provided storage
      await expect(
        mockedStorage.getForUser("mySession", "webId"),
      ).resolves.toEqual(mockWebId());
      await expect(
        mockedStorage.getForUser("mySession", "isLoggedIn"),
      ).resolves.toBe("true");

      // Check that the returned fetch function is authenticated
      const { fetch: mockedFetch } = jest.requireMock(
        "@inrupt/universal-fetch",
      ) as jest.Mocked<typeof UniversalFetch>;
      mockedFetch.mockResolvedValueOnce(new NodeResponse());
      await result.fetch("https://some.url");
      const headers = new NodeHeaders(mockedFetch.mock.calls[0][1]?.headers);
      expect(headers.get("Authorization")).toContain("DPoP");
    });

    it("uses 'none' client authentication if using Solid-OIDC client identifiers", async () => {
      const mockedIssuer = setupDefaultOidcClientMock();
      const mockedStorage = mockDefaultRedirectStorage();

      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockedStorage,
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
        clientRegistrar: {
          getClient: async () => {
            return {
              clientId: "https://some.client.identifier",
              clientType: "solid-oidc",
            };
          },
        },
      });

      await authCodeRedirectHandler.handle(
        "https://my.app/redirect?code=someCode&state=someState",
      );

      expect(mockedIssuer.Client).toHaveBeenCalledWith(
        expect.objectContaining({
          token_endpoint_auth_method: "none",
        }),
      );
    });

    it("properly performs Bearer token exchange", async () => {
      setupOidcClientMock(mockBearerTokens());
      const mockedStorage = mockDefaultRedirectStorage();
      await mockedStorage.setForUser("mySession", {
        dpop: "false",
      });

      // Run the test
      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockedStorage,
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });

      const result = await authCodeRedirectHandler.handle(
        "https://my.app/redirect?code=someCode&state=someState",
      );

      // Check that the returned fetch function is authenticated
      const { fetch: mockedFetch } = jest.requireMock(
        "@inrupt/universal-fetch",
      ) as jest.Mocked<typeof UniversalFetch>;
      mockedFetch.mockResolvedValueOnce(new NodeResponse());
      await result.fetch("https://some.url");
      const headers = new NodeHeaders(mockedFetch.mock.calls[0][1]?.headers);
      expect(headers.get("Authorization")).toContain("Bearer");
    });

    it("cleans up the redirect IRI from the OIDC parameters", async () => {
      // This function represents the openid-client callback
      const callback = (jest.fn() as any).mockResolvedValueOnce(
        mockDpopTokens(),
      );
      setupOidcClientMock(undefined, callback);
      const mockedStorage = mockDefaultRedirectStorage();

      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockedStorage,
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });

      await authCodeRedirectHandler.handle(
        "https://my.app/redirect?code=someCode&state=someState&iss=https://example.org/issuer",
      );

      expect(callback).toHaveBeenCalledWith(
        "https://my.app/redirect",
        { code: "someCode", state: "someState" },
        // The code verifier comes from the mocked storage.
        { code_verifier: "some code verifier", state: "someState" },
        expect.anything(),
      );
    });

    it("stores the refresh token if one is returned", async () => {
      const mockedTokens = mockDpopTokens();
      mockedTokens.refresh_token = "some refresh token";
      setupOidcClientMock(mockedTokens);
      const mockedStorage = mockDefaultRedirectStorage();

      // Run the test
      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockedStorage,
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });

      await authCodeRedirectHandler.handle(
        "https://my.app/redirect?code=someCode&state=someState",
      );

      // Check that the session information is stored in the provided storage
      await expect(
        mockedStorage.getForUser("mySession", "refreshToken"),
      ).resolves.toBe("some refresh token");
    });

    it("stores the DPoP key pair if the refresh token is DPoP-bound", async () => {
      const mockedTokens = mockDpopTokens();
      mockedTokens.refresh_token = "some refresh token";
      setupOidcClientMock(mockedTokens);
      const mockedStorage = mockDefaultRedirectStorage();

      // Run the test
      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockedStorage,
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });

      await authCodeRedirectHandler.handle(
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
      const mockedTokens = mockDpopTokens();
      mockedTokens.refresh_token = "some refresh token";
      setupOidcClientMock(mockedTokens);
      const mockedStorage = mockDefaultRedirectStorage();
      const mockEmitter = new EventEmitter();
      const mockEmit = jest.spyOn(mockEmitter, "emit");

      // Run the test
      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockedStorage,
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });

      await authCodeRedirectHandler.handle(
        "https://my.app/redirect?code=someCode&state=someState",
        mockEmitter,
      );

      expect(mockEmit).toHaveBeenCalledWith(
        EVENTS.NEW_REFRESH_TOKEN,
        "some refresh token",
      );
    });

    it("throws if the iss parameter does not match stored issuer", async () => {
      const mockedStorage = mockDefaultRedirectStorage();
      const mockedTokens = mockDpopTokens();
      // oidc-client will throw if the iss parameter mismatches.
      setupOidcClientMock(mockedTokens, () => {
        throw new Error();
      });
      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockedStorage,
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });

      await expect(
        authCodeRedirectHandler.handle(
          "https://my.app/redirect?code=someCode&state=someState&iss=someIssuer",
        ),
      ).rejects.toThrow();
    });

    it("throws if the IdP does not return an access token", async () => {
      const mockedTokens = mockDpopTokens();
      mockedTokens.access_token = undefined;
      setupOidcClientMock(mockedTokens);
      const mockedStorage = mockDefaultRedirectStorage();

      // Run the test
      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockedStorage,
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });

      await expect(
        authCodeRedirectHandler.handle(
          "https://my.app/redirect?code=someCode&state=someState",
        ),
      ).rejects.toThrow(
        `The Identity Provider [${
          mockDefaultIssuerConfig().issuer
        }] did not return the expected tokens: missing at least one of 'access_token', 'id_token.`,
      );
    });

    it("throws if the IdP does not return an ID token", async () => {
      const mockedTokens = mockDpopTokens();
      mockedTokens.id_token = undefined;
      setupOidcClientMock(mockedTokens);
      const mockedStorage = mockDefaultRedirectStorage();

      // Run the test
      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockedStorage,
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });

      await expect(
        authCodeRedirectHandler.handle(
          "https://my.app/redirect?code=someCode&state=someState",
        ),
      ).rejects.toThrow(
        `The Identity Provider [${
          mockDefaultIssuerConfig().issuer
        }] did not return the expected tokens: missing at least one of 'access_token', 'id_token.`,
      );
    });

    it("throws if the Session manager cannot retrieve the session info", async () => {
      setupDefaultOidcClientMock();
      const mockedStorage = mockDefaultRedirectStorage();
      const mockedSessionManager = mockSessionInfoManager(mockedStorage);
      mockedSessionManager.get = jest
        .fn()
        .mockReturnValue(undefined) as typeof mockedSessionManager.get;

      // Run the test
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
      setupDefaultOidcClientMock();
      const mockedStorage = mockStorageUtility({});

      // Run the test
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
    });
  });
});
