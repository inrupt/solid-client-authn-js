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

import {
  IClient,
  IClientRegistrar,
  IClientRegistrarOptions,
  IIssuerConfigFetcher,
  USER_SESSION_PREFIX,
  IIssuerConfig,
} from "@inrupt/solid-client-authn-core";
import {
  StorageUtilityMock,
  mockStorageUtility,
} from "@inrupt/solid-client-authn-core/mocks";
import type * as SolidClientAuthnCore from "@inrupt/solid-client-authn-core";
import { jest, it, describe, expect } from "@jest/globals";
import { CodeExchangeResult, getBearerToken } from "@inrupt/oidc-client-ext";
import type * as OidcClientExt from "@inrupt/oidc-client-ext";
import { Response } from "cross-fetch";
import { JWK, importJWK } from "jose";
import { KeyObject } from "crypto";
import { AuthCodeRedirectHandler } from "./AuthCodeRedirectHandler";
import { SessionInfoManagerMock } from "../../../sessionInfo/__mocks__/SessionInfoManager";
import { LocalStorageMock } from "../../../storage/__mocks__/LocalStorage";
import {
  mockDefaultTokenRefresher,
  mockTokenRefresher,
} from "../refresh/__mocks__/TokenRefresher";

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

const mockWebId = (): string => "https://my.webid";

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

const mockIssuer = (): IIssuerConfig => {
  return {
    issuer: "https://some.issuer",
    authorizationEndpoint: "https://some.issuer/autorization",
    tokenEndpoint: "https://some.issuer/token",
    jwksUri: "https://some.issuer/keys",
    claimsSupported: ["code", "openid"],
    subjectTypesSupported: ["public"],
    registrationEndpoint: "https://some.issuer/registration",
    grantTypesSupported: ["authorization_code"],
    scopesSupported: ["openid"],
  };
};

const mockAccessTokenDpop = (): AccessJwt => {
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

const mockAccessTokenBearer = (): string => "some token";

const MOCK_EXPIRE_TIME = 1337;
const mockTokenEndpointBearerResponse = (): CodeExchangeResult => {
  return {
    accessToken: mockAccessTokenBearer(),
    idToken: mockIdToken(),
    webId: mockWebId(),
    expiresIn: MOCK_EXPIRE_TIME,
    refreshToken: "some refresh token",
  };
};

const mockTokenEndpointDpopResponse = async (): Promise<CodeExchangeResult> => {
  return {
    accessToken: JSON.stringify(mockAccessTokenDpop()),
    idToken: mockIdToken(),
    webId: mockWebId(),
    dpopKey: {
      privateKey: (await importJWK(mockJwk())) as KeyObject,
      // Note that here for convenience the private key is also used as public key.
      // Obviously, this should never be done in non-test code.
      publicKey: mockJwk(),
    },
    expiresIn: MOCK_EXPIRE_TIME,
    refreshToken: "some DPoP-bound refresh token",
  };
};

const mockLocalStorage = (stored: Record<string, string>) => {
  // Kinda weird: `(window as any).localStorage = new LocalStorageMock(stored)` does
  // not work as intended unless the following snippet is present in the test suite.
  // On the other hand, only ever mocking localstorage with the following snippet
  // works well.
  Object.defineProperty(window, "localStorage", {
    value: new LocalStorageMock(stored),
    writable: true,
  });
};

jest.mock("@inrupt/oidc-client-ext");
// jest.mock("cross-fetch", () => ({
//   ...(jest.requireActual("cross-fetch") as typeof CrossFetch),
//   default: jest.fn<typeof fetch>(),
//   fetch: jest.fn<typeof fetch>(),
// }));

jest.useFakeTimers();

function mockOidcClient(): typeof OidcClientExt {
  const mockedOidcClient = jest.requireMock<typeof OidcClientExt>(
    "@inrupt/oidc-client-ext"
  );
  mockedOidcClient.getDpopToken = jest
    .fn<typeof mockedOidcClient.getDpopToken>()
    .mockImplementationOnce(mockTokenEndpointDpopResponse);
  mockedOidcClient.getBearerToken = jest
    .fn<typeof mockedOidcClient.getBearerToken>()
    .mockResolvedValue(mockTokenEndpointBearerResponse());
  mockedOidcClient.refresh = jest
    .fn<typeof mockedOidcClient.refresh>()
    .mockResolvedValueOnce({
      ...mockTokenEndpointBearerResponse(),
      refreshToken: "some rotated refresh token",
    });
  return mockedOidcClient;
}

function mockIssuerConfigFetcher(config: IIssuerConfig): IIssuerConfigFetcher {
  return {
    fetchConfig: async (): Promise<IIssuerConfig> => config,
  };
}

const mockClient = (): IClient => {
  return {
    clientId: "some client",
    clientType: "dynamic",
  };
};

function mockClientRegistrar(client: IClient): IClientRegistrar {
  return {
    getClient: async (
      _options: IClientRegistrarOptions,
      _issuer: IIssuerConfig
    ): Promise<IClient> => client,
  };
}

const mockFetch = (response: Response) => {
  const mockedFetch = jest.fn(global.fetch).mockResolvedValue(response);
  window.fetch = mockedFetch;
  return mockedFetch;
};

const defaultMocks = {
  storageUtility: StorageUtilityMock,
  sessionInfoManager: SessionInfoManagerMock,
  clientRegistrar: mockClientRegistrar(mockClient()),
  issuerConfigFetcher: mockIssuerConfigFetcher(mockIssuer()),
  tokenRefresher: mockDefaultTokenRefresher(),
};

function getAuthCodeRedirectHandler(
  mocks: Partial<typeof defaultMocks> = defaultMocks
): AuthCodeRedirectHandler {
  return new AuthCodeRedirectHandler(
    mocks.storageUtility ?? defaultMocks.storageUtility,
    mocks.sessionInfoManager ?? defaultMocks.sessionInfoManager,
    mocks.issuerConfigFetcher ?? defaultMocks.issuerConfigFetcher,
    mocks.clientRegistrar ?? defaultMocks.clientRegistrar,
    mocks.tokenRefresher ?? defaultMocks.tokenRefresher
  );
}

const DEFAULT_AUTHORIZATION_CODE = "someCode";
const DEFAULT_CODE_VERIFIER = "some code verifier";
const DEFAULT_REDIRECT_URL = "https://some.redirect.uri";
const DEFAULT_OAUTH_STATE = "oauth2StateValue";

const mockRedirectUrl = () => {
  const redirectUrl = new URL(DEFAULT_REDIRECT_URL);
  redirectUrl.searchParams.append("state", DEFAULT_OAUTH_STATE);
  redirectUrl.searchParams.append("code", DEFAULT_AUTHORIZATION_CODE);
  return redirectUrl.href;
};

const mockDefaultStorageUtility = (
  options: { dpop?: boolean; codeVerifier?: string; redirectUrl?: string } = {
    dpop: true,
    codeVerifier: DEFAULT_CODE_VERIFIER,
    redirectUrl: DEFAULT_REDIRECT_URL,
  }
) =>
  mockStorageUtility({
    [`${USER_SESSION_PREFIX}:${DEFAULT_OAUTH_STATE}`]: {
      sessionId: "mySession",
    },
    [`${USER_SESSION_PREFIX}:mySession`]: {
      dpop: options.dpop ? "true" : "false",
      issuer: mockIssuer().issuer.toString(),
      codeVerifier: options.codeVerifier ?? DEFAULT_CODE_VERIFIER,
      redirectUrl: options.redirectUrl ?? DEFAULT_REDIRECT_URL,
    },
  });

describe("AuthCodeRedirectHandler", () => {
  describe("canHandle", () => {
    it("Accepts a valid url with the correct query", async () => {
      const authCodeRedirectHandler = getAuthCodeRedirectHandler();
      expect(await authCodeRedirectHandler.canHandle(mockRedirectUrl())).toBe(
        true
      );
    });

    it("throws on invalid url", async () => {
      const authCodeRedirectHandler = getAuthCodeRedirectHandler();
      await expect(() =>
        authCodeRedirectHandler.canHandle("beep boop I am a robot")
      ).rejects.toThrow(
        "[beep boop I am a robot] is not a valid URL, and cannot be used as a redirect URL: TypeError: Invalid URL: beep boop I am a robot"
      );
    });

    it("Rejects a valid url with the incorrect query", async () => {
      const authCodeRedirectHandler = getAuthCodeRedirectHandler();
      expect(
        await authCodeRedirectHandler.canHandle(
          "https://coolparty.com/?meep=mop"
        )
      ).toBe(false);
    });

    it("rejects a valid url without authorization code", async () => {
      const authCodeRedirectHandler = getAuthCodeRedirectHandler();
      expect(
        await authCodeRedirectHandler.canHandle(
          "https://coolparty.com/?state=someState"
        )
      ).toBe(false);
    });

    it("rejects a valid url without state", async () => {
      const authCodeRedirectHandler = getAuthCodeRedirectHandler();
      expect(
        await authCodeRedirectHandler.canHandle(
          "https://coolparty.com/?code=someCode"
        )
      ).toBe(false);
    });
  });

  describe("handle", () => {
    it("throws on non-redirect URL", async () => {
      const authCodeRedirectHandler = getAuthCodeRedirectHandler();
      await expect(
        authCodeRedirectHandler.handle("https://my.app")
      ).rejects.toThrow(
        "AuthCodeRedirectHandler cannot handle [https://my.app]: it is missing one of [code, state]."
      );
    });

    it("retrieves the OIDC context from memory", async () => {
      const mockedOidcClient = mockOidcClient();
      mockFetch(
        new Response("", {
          status: 200,
        })
      );
      const storage = mockDefaultStorageUtility();

      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: storage,
      });

      await authCodeRedirectHandler.handle(mockRedirectUrl());

      expect(mockedOidcClient.getDpopToken).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          codeVerifier: DEFAULT_CODE_VERIFIER,
          redirectUrl: DEFAULT_REDIRECT_URL,
        })
      );
    });

    it("throws if the code verifier is missing from storage", async () => {
      mockOidcClient();
      mockFetch(
        new Response("", {
          status: 200,
        })
      );
      const storageUtility = mockDefaultStorageUtility();
      await storageUtility.deleteForUser("mySession", "codeVerifier");
      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility,
      });

      await expect(
        authCodeRedirectHandler.handle(mockRedirectUrl())
      ).rejects.toThrow();
    });

    it("throws if the redirect URL is missing from storage", async () => {
      mockOidcClient();
      mockFetch(
        new Response("", {
          status: 200,
        })
      );
      const storageUtility = mockDefaultStorageUtility();
      await storageUtility.deleteForUser("mySession", "redirectUrl");
      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility,
      });

      await expect(
        authCodeRedirectHandler.handle(mockRedirectUrl())
      ).rejects.toThrow();
    });

    it("Fails if a session was not retrieved", async () => {
      mockOidcClient();
      mockFetch(
        new Response("", {
          status: 200,
        })
      );
      defaultMocks.sessionInfoManager.get.mockResolvedValueOnce(undefined);

      const authCodeRedirectHandler = getAuthCodeRedirectHandler();
      await expect(
        authCodeRedirectHandler.handle(mockRedirectUrl())
      ).rejects.toThrow("Could not retrieve session");
    });

    it("returns an authenticated bearer fetch if requested", async () => {
      mockOidcClient();
      const mockedFetch = jest.mocked<typeof fetch>(window.fetch);
      mockedFetch.mockResolvedValueOnce(
        new Response("", {
          status: 200,
        })
      );

      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockDefaultStorageUtility({ dpop: false }),
      });

      const redirectInfo = await authCodeRedirectHandler.handle(
        mockRedirectUrl()
      );

      // This will call the oidc-client-ext module, which is mocked at
      // the top of this file. The purpose of this test is to check that, if
      // no additional information is given, the `getBearerToken` method is called
      // (as opposed to the getDpopToken one), which here returns a mock token
      // with the value "some token".
      await redirectInfo.fetch("https://some.other.url");

      const header = new Headers(mockedFetch.mock.calls[0][1]?.headers);
      expect(header.get("Authorization")).toMatch(/^Bearer some token$/);
    });

    it("returns an authenticated DPoP fetch if requested", async () => {
      mockOidcClient();
      const mockedFetch = jest.mocked<typeof fetch>(window.fetch);
      mockedFetch.mockResolvedValueOnce(
        new Response("", {
          status: 200,
        })
      );

      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockDefaultStorageUtility({ dpop: true }),
      });
      const redirectInfo = await authCodeRedirectHandler.handle(
        mockRedirectUrl()
      );
      await redirectInfo.fetch("https://some.other.url");

      const header = new Headers(mockedFetch.mock.calls[0][1]?.headers);
      expect(header.get("Authorization")).toMatch(/^DPoP .+$/);
    });

    it("saves session information in storage on successful login", async () => {
      mockOidcClient();
      window.fetch = jest.fn(global.fetch).mockReturnValue(
        new Promise((resolve) => {
          resolve(
            new Response("", {
              status: 200,
            })
          );
        })
      );

      const mockedStorage = mockDefaultStorageUtility();

      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockedStorage,
      });
      await authCodeRedirectHandler.handle(mockRedirectUrl());
      await expect(
        mockedStorage.getForUser("mySession", "redirectUrl", {
          secure: false,
        })
      ).resolves.toBe("https://some.redirect.uri/?state=oauth2StateValue");

      // The ID token should not have been stored
      await expect(
        mockedStorage.getForUser("mySession", "idToken", {
          secure: false,
        })
      ).resolves.toBeUndefined();
    });

    it("preserves any query strings from the redirect URI", async () => {
      mockOidcClient();

      window.fetch = (jest.fn() as any).mockReturnValue(
        new Promise((resolve) => {
          resolve(
            new Response("", {
              status: 200,
            })
          );
        })
      ) as jest.Mock<typeof fetch>;

      const mockedStorage = mockDefaultStorageUtility();

      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockedStorage,
      });
      const redirectUrl = new URL(mockRedirectUrl());
      redirectUrl.searchParams.append("someKey", "someValue");
      await authCodeRedirectHandler.handle(redirectUrl.href);
      await expect(
        mockedStorage.getForUser("mySession", "redirectUrl", {
          secure: false,
        })
      ).resolves.toBe(
        "https://some.redirect.uri/?state=oauth2StateValue&someKey=someValue"
      );
    });

    it("returns the expiration time normalised to the current time", async () => {
      mockOidcClient();
      window.fetch = jest.fn<typeof fetch>();
      const MOCK_TIMESTAMP = 10000;
      Date.now = jest
        .fn()
        // Date.now is called twice: once to be able to calculate the auth token expiry time,
        // and once to set the cookie expiry. We only care about the second in this test.
        .mockReturnValueOnce(MOCK_TIMESTAMP) as typeof Date.now;

      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockDefaultStorageUtility(),
      });

      const sessionInfo = await authCodeRedirectHandler.handle(
        mockRedirectUrl()
      );

      expect(sessionInfo.expirationDate).toBe(
        MOCK_TIMESTAMP + MOCK_EXPIRE_TIME * 1000
      );
    });

    it("returns null for the expiration time if none was provided", async () => {
      const mockedOidcClient = mockOidcClient();
      window.fetch = jest.fn<typeof fetch>();
      mockedOidcClient.getBearerToken = jest
        .fn(getBearerToken)
        .mockResolvedValueOnce({
          accessToken: mockAccessTokenBearer(),
          idToken: mockIdToken(),
          webId: mockWebId(),
          // no expiresIn
        });

      const mockedStorage = mockDefaultStorageUtility({ dpop: false });

      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockedStorage,
      });

      const sessionInfo = await authCodeRedirectHandler.handle(
        mockRedirectUrl()
      );

      expect(sessionInfo.expirationDate).toBeNull();
    });

    it("clears the oidc-client specific session information", async () => {
      mockOidcClient();
      mockLocalStorage({
        // This mocks how oidc-client stores session information
        "oidc.oauth2StateValue": "some arbitrary value",
      });
      mockFetch(new Response());

      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockDefaultStorageUtility(),
      });
      await authCodeRedirectHandler.handle(mockRedirectUrl());
      expect(window.localStorage.getItem("oidc.oauth2StateValue")).toBeNull();
    });
  });

  it("returns a fetch that supports the refresh flow", async () => {
    mockOidcClient();
    const mockedStorage = mockDefaultStorageUtility();
    const coreModule = jest.requireActual<typeof SolidClientAuthnCore>(
      "@inrupt/solid-client-authn-core"
    );
    const mockAuthenticatedFetchBuild = jest.spyOn(
      coreModule,
      "buildAuthenticatedFetch"
    );

    const tokenRefresher = mockTokenRefresher(
      await mockTokenEndpointDpopResponse()
    );
    // Run the test
    const authCodeRedirectHandler = getAuthCodeRedirectHandler({
      storageUtility: mockedStorage,
      tokenRefresher,
    });

    await authCodeRedirectHandler.handle(mockRedirectUrl());

    expect(mockAuthenticatedFetchBuild).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        refreshOptions: {
          refreshToken: "some DPoP-bound refresh token",
          sessionId: "mySession",
          tokenRefresher,
        },
        expiresIn: 1337,
      })
    );
  });
});
