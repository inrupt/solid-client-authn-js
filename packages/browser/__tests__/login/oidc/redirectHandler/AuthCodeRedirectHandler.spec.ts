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

import {
  StorageUtilityMock,
  mockStorageUtility,
  IClient,
  IClientRegistrar,
  IClientRegistrarOptions,
  IIssuerConfigFetcher,
  USER_SESSION_PREFIX,
  IIssuerConfig,
} from "@inrupt/solid-client-authn-core";
import { jest, it, describe, expect } from "@jest/globals";
import { TokenEndpointResponse } from "@inrupt/oidc-client-ext";
import { Response } from "cross-fetch";
import { JWK, parseJwk } from "@inrupt/jose-legacy-modules";
import {
  AuthCodeRedirectHandler,
  DEFAULT_LIFESPAN,
} from "../../../../src/login/oidc/redirectHandler/AuthCodeRedirectHandler";
import { RedirectorMock } from "../../../../src/login/oidc/__mocks__/Redirector";
import { SessionInfoManagerMock } from "../../../../src/sessionInfo/__mocks__/SessionInfoManager";
import { KEY_CURRENT_SESSION } from "../../../../src/constant";
import { LocalStorageMock } from "../../../../src/storage/__mocks__/LocalStorage";

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
    subjectTypesSupported: ["public", "pairwise"],
    registrationEndpoint: "https://some.issuer/registration",
    grantTypesSupported: ["authorization_code"],
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
const mockTokenEndpointBearerResponse = (): TokenEndpointResponse => {
  return {
    accessToken: mockAccessTokenBearer(),
    idToken: mockIdToken(),
    webId: mockWebId(),
    expiresIn: MOCK_EXPIRE_TIME,
  };
};

const mockTokenEndpointDpopResponse =
  async (): Promise<TokenEndpointResponse> => {
    return {
      accessToken: JSON.stringify(mockAccessTokenDpop()),
      idToken: mockIdToken(),
      webId: mockWebId(),
      dpopKey: {
        privateKey: await parseJwk(mockJwk()),
        // Note that here for convenience the private key is also used as public key.
        // Obviously, this should never be done in non-test code.
        publicKey: mockJwk(),
      },
      expiresIn: MOCK_EXPIRE_TIME,
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

const defaultJwt = {
  sub: "https://some.webid",
};

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
function mockOidcClient(jwt: typeof defaultJwt = defaultJwt): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockedOidcClient = jest.requireMock("@inrupt/oidc-client-ext") as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockedOidcClient.generateJwkForDpop = (jest.fn() as any).mockResolvedValue(
    mockJwk()
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockedOidcClient.createDpopHeader = (jest.fn() as any).mockResolvedValue(
    "someToken"
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockedOidcClient.decodeJwt = (jest.fn() as any).mockResolvedValue(jwt);
  mockedOidcClient.getDpopToken = mockTokenEndpointDpopResponse;
  mockedOidcClient.getBearerToken = mockTokenEndpointBearerResponse;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockedOidcClient.validateIdToken = (jest.fn() as any).mockResolvedValue(true);
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

const mockFetch = (response: Response): void => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  window.fetch = (jest.fn() as any).mockResolvedValue(
    response
  ) as typeof window.fetch;
};

const defaultMocks = {
  storageUtility: StorageUtilityMock,
  redirector: RedirectorMock,
  sessionInfoManager: SessionInfoManagerMock,
  clientRegistrar: mockClientRegistrar(mockClient()),
  issuerConfigFetcher: mockIssuerConfigFetcher(mockIssuer()),
};

function getAuthCodeRedirectHandler(
  mocks: Partial<typeof defaultMocks> = defaultMocks
): AuthCodeRedirectHandler {
  return new AuthCodeRedirectHandler(
    mocks.storageUtility ?? defaultMocks.storageUtility,
    mocks.sessionInfoManager ?? defaultMocks.sessionInfoManager,
    mocks.issuerConfigFetcher ?? defaultMocks.issuerConfigFetcher,
    mocks.clientRegistrar ?? defaultMocks.clientRegistrar
  );
}

describe("AuthCodeRedirectHandler", () => {
  describe("canHandle", () => {
    it("Accepts a valid url with the correct query", async () => {
      const authCodeRedirectHandler = getAuthCodeRedirectHandler();
      expect(
        await authCodeRedirectHandler.canHandle(
          "https://coolparty.com/?code=someCode&state=oauth2_state_value"
        )
      ).toBe(true);
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

    it("retrieves the code verifier from memory", async () => {
      mockOidcClient();
      mockFetch(
        new Response("", {
          status: 200,
        })
      );
      const storage = mockStorageUtility({
        "solidClientAuthenticationUser:oauth2_state_value": {
          sessionId: "userId",
        },
        "solidClientAuthenticationUser:userId": {
          codeVerifier: "a",
          redirectUrl: "b",
          issuer: "someIssuer",
          dpop: "true",
        },
      });

      const spyStorage = jest.spyOn(storage, "getForUser");

      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: storage,
      });

      await authCodeRedirectHandler.handle(
        "https://coolsite.com/?code=someCode&state=oauth2_state_value"
      );

      expect(spyStorage).toHaveBeenCalledWith("userId", "codeVerifier", {
        errorIfNull: true,
      });
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
        authCodeRedirectHandler.handle(
          "https://coolsite.com/?code=someCode&state=oauth2_state_value"
        )
      ).rejects.toThrow("Could not retrieve session");
    });

    // We use ts-ignore comments here only to access mock call arguments
    /* eslint-disable @typescript-eslint/ban-ts-comment */
    it("returns an authenticated bearer fetch by default", async () => {
      mockOidcClient();
      mockLocalStorage({});

      mockFetch(
        new Response("", {
          status: 200,
        })
      );

      const testIssuer = "some test Issuer";
      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockStorageUtility({
          "solidClientAuthenticationUser:mySession": {
            issuer: testIssuer,
          },
          "solidClientAuthenticationUser:oauth2_state_value": {
            sessionId: "mySession",
          },
        }),
      });

      const redirectInfo = await authCodeRedirectHandler.handle(
        "https://coolsite.com/?code=someCode&state=oauth2_state_value"
      );

      // This will call the oidc-client-ext module, which is mocked at
      // the top of this file. The purpose of this test is to check that, if
      // no additional information is given, the `getBearerToken` method is called
      // (as opposed to the getDpopToken one), which here returns a mock token
      // with the value "some token".
      await redirectInfo.fetch("https://some.other.url");

      // @ts-ignore
      const header = window.fetch.mock.calls[0][1].headers.Authorization;
      expect(
        // @ts-ignore
        header
      ).toMatch(/^Bearer some token$/);
    });

    it("returns an authenticated DPoP fetch if requested", async () => {
      mockOidcClient();
      mockLocalStorage({});

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window.fetch = (jest.fn() as any).mockReturnValue(
        new Promise((resolve) => {
          resolve(
            new Response("", {
              status: 200,
            })
          );
        })
      ) as jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;

      const storage = mockStorageUtility({
        "solidClientAuthenticationUser:oauth2StateValue": {
          sessionId: "mySession",
        },
        "solidClientAuthenticationUser:mySession": {
          dpop: "true",
          issuer: mockIssuer().issuer.toString(),
          codeVerifier: "some code verifier",
          redirectUrl: "https://some.redirect.uri",
        },
      });

      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: storage,
      });
      const redirectInfo = await authCodeRedirectHandler.handle(
        "https://coolsite.com/?code=someCode&state=oauth2StateValue"
      );
      await redirectInfo.fetch("https://some.other.url");
      // @ts-ignore
      const header = window.fetch.mock.calls[0][1].headers.Authorization;
      expect(
        // @ts-ignore
        header
      ).toMatch(/^DPoP .+$/);
    });

    it("saves session information in storage on successful login", async () => {
      mockOidcClient();
      mockLocalStorage({});

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window.fetch = (jest.fn() as any).mockReturnValue(
        new Promise((resolve) => {
          resolve(
            new Response("", {
              status: 200,
            })
          );
        })
      ) as jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;

      const mockedStorage = mockStorageUtility({
        [`${USER_SESSION_PREFIX}:oauth2StateValue`]: {
          sessionId: "mySession",
        },
        [`${USER_SESSION_PREFIX}:mySession`]: {
          dpop: "true",
          issuer: mockIssuer().issuer.toString(),
          codeVerifier: "some code verifier",
          redirectUrl: "https://some.redirect.uri",
        },
      });

      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockedStorage,
      });
      await authCodeRedirectHandler.handle(
        "https://coolsite.com/redirect?code=someCode&state=oauth2StateValue"
      );
      // Check that the current session is stored correctly __specifically__ in
      // 'localStorage'.
      expect(window.localStorage.getItem(KEY_CURRENT_SESSION)).toEqual(
        "mySession"
      );
      await expect(
        mockedStorage.getForUser("mySession", "redirectUrl", {
          secure: false,
        })
      ).resolves.toStrictEqual(
        "https://coolsite.com/redirect?state=oauth2StateValue"
      );
    });

    it("preserves any query strings from the redirect URI", async () => {
      mockOidcClient();
      mockLocalStorage({});

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window.fetch = (jest.fn() as any).mockReturnValue(
        new Promise((resolve) => {
          resolve(
            new Response("", {
              status: 200,
            })
          );
        })
      ) as jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;

      const mockedStorage = mockStorageUtility({
        [`${USER_SESSION_PREFIX}:oauth2StateValue`]: {
          sessionId: "mySession",
        },
        [`${USER_SESSION_PREFIX}:mySession`]: {
          dpop: "true",
          issuer: mockIssuer().issuer.toString(),
          codeVerifier: "some code verifier",
          redirectUrl: "https://some.redirect.uri?someKey=someValue",
        },
      });

      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockedStorage,
      });
      await authCodeRedirectHandler.handle(
        "https://coolsite.com/redirect?code=someCode&state=oauth2StateValue&someKey=someValue"
      );
      await expect(
        mockedStorage.getForUser("mySession", "redirectUrl", {
          secure: false,
        })
      ).resolves.toStrictEqual(
        "https://coolsite.com/redirect?state=oauth2StateValue&someKey=someValue"
      );
    });

    it("returns the expiration time normalised to the current time", async () => {
      mockOidcClient();
      const MOCK_TIMESTAMP = 10000;
      Date.now = jest
        .fn()
        // Date.now is called twice: once to be able to calculate the auth token expiry time,
        // and once to set the cookie expiry. We only care about the second in this test.
        .mockReturnValueOnce(MOCK_TIMESTAMP)
        .mockReturnValueOnce(MOCK_TIMESTAMP) as typeof Date.now;

      const testIssuer = "some test Issuer";
      const mockedStorage = mockStorageUtility({
        "solidClientAuthenticationUser:mySession": {
          issuer: testIssuer,
        },
        "solidClientAuthenticationUser:oauth2_state_value": {
          sessionId: "mySession",
        },
      });

      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockedStorage,
      });

      const sessionInfo = await authCodeRedirectHandler.handle(
        "https://coolsite.com/?code=someCode&state=oauth2_state_value"
      );

      expect(sessionInfo.expirationDate).toBe(
        MOCK_TIMESTAMP + MOCK_EXPIRE_TIME * 1000
      );
    });

    it("returns null for the expiration time if none was provided", async () => {
      mockOidcClient();
      const mockedOidcClient = jest.requireMock(
        "@inrupt/oidc-client-ext"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any;
      jest.spyOn(mockedOidcClient, "getBearerToken").mockReturnValueOnce({
        accessToken: mockAccessTokenBearer(),
        idToken: mockIdToken(),
        webId: mockWebId(),
        // no expiresIn
      });

      const testIssuer = "some test Issuer";
      const mockedStorage = mockStorageUtility({
        "solidClientAuthenticationUser:mySession": {
          issuer: testIssuer,
        },
        "solidClientAuthenticationUser:oauth2_state_value": {
          sessionId: "mySession",
        },
      });

      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockedStorage,
      });

      const sessionInfo = await authCodeRedirectHandler.handle(
        "https://coolsite.com/?code=someCode&state=oauth2_state_value"
      );

      expect(sessionInfo.expirationDate).toBeNull();
    });
  });

  it("stores information about the resource server cookie in local storage on successful authentication", async () => {
    mockOidcClient();
    mockLocalStorage({});

    // This mocks the fetch to the Resource Server session endpoint
    // Note: Currently, the endpoint only returns the webid in plain/text, it could
    // be extended later to also provide the cookie expiration.
    mockFetch(
      new Response("https://my.webid", {
        status: 200,
      })
    );

    const MOCK_TIMESTAMP = 10000;
    Date.now = jest
      .fn()
      // Date.now is called twice: once to be able to calculate the auth token expiry time,
      // and once to set the cookie expiry. We only care about the second in this test.
      .mockReturnValueOnce(MOCK_TIMESTAMP)
      .mockReturnValueOnce(MOCK_TIMESTAMP) as typeof Date.now;

    const testIssuer = "some test Issuer";
    const mockedStorage = mockStorageUtility({
      "solidClientAuthenticationUser:mySession": {
        issuer: testIssuer,
      },
      "solidClientAuthenticationUser:oauth2_state_value": {
        sessionId: "mySession",
      },
    });

    const authCodeRedirectHandler = getAuthCodeRedirectHandler({
      storageUtility: mockedStorage,
    });

    await authCodeRedirectHandler.handle(
      "https://coolsite.com/?code=someCode&state=oauth2_state_value"
    );
    expect(
      JSON.parse(
        (await mockedStorage.get("tmp-resource-server-session-info")) ?? "{}"
      )
    ).toEqual({
      webId: "https://my.webid",
      sessions: {
        "https://my.webid": {
          expiration: MOCK_TIMESTAMP + DEFAULT_LIFESPAN,
        },
      },
    });
  });

  it("does not look the session endpoint up if the ESS cookie workaround has been disabled", async () => {
    mockOidcClient();
    mockLocalStorage({
      "tmp-resource-server-session-enabled": "false",
    });

    // This mocks the fetch to the Resource Server session endpoint
    // Note: Currently, the endpoint only returns the webid in plain/text, it could
    // be extended later to also provide the cookie expiration.
    mockFetch(
      new Response("https://my.webid", {
        status: 200,
      })
    );

    const MOCK_TIMESTAMP = 10000;
    Date.now = jest
      .fn()
      // Date.now is called twice: once to be able to calculate the auth token expiry time,
      // and once to set the cookie expiry. We only care about the second in this test.
      .mockReturnValueOnce(MOCK_TIMESTAMP)
      .mockReturnValueOnce(MOCK_TIMESTAMP) as typeof Date.now;

    const testIssuer = "some test Issuer";
    const mockedStorage = mockStorageUtility({
      "solidClientAuthenticationUser:mySession": {
        issuer: testIssuer,
      },
      "solidClientAuthenticationUser:oauth2_state_value": {
        sessionId: "mySession",
      },
    });

    const authCodeRedirectHandler = getAuthCodeRedirectHandler({
      storageUtility: mockedStorage,
    });

    await authCodeRedirectHandler.handle(
      "https://coolsite.com/?code=someCode&state=oauth2_state_value"
    );
    expect(
      JSON.parse(
        (await mockedStorage.get("tmp-resource-server-session-info")) ?? "{}"
      )
    ).toEqual({});
  });

  it("store nothing if the resource server has no session endpoint", async () => {
    mockOidcClient();
    mockLocalStorage({});
    // This mocks the fetch to the Resource Server session endpoint
    // Note: Currently, the endpoint only returns the WebID in plain/text, it could
    // be extended later to also provide the cookie expiration.
    mockFetch(
      new Response("", {
        status: 404,
      })
    );

    const mockedStorage = mockStorageUtility({
      "solidClientAuthenticationUser:mySession": {
        issuer: "some dummy test Issuer",
      },
      "solidClientAuthenticationUser:oauth2_state_value": {
        sessionId: "mySession",
      },
    });

    const authCodeRedirectHandler = getAuthCodeRedirectHandler({
      storageUtility: mockedStorage,
    });

    await authCodeRedirectHandler.handle(
      "https://coolsite.com/?code=someCode&state=oauth2_state_value"
    );
    expect(
      JSON.parse(
        (await mockedStorage.get("tmp-resource-server-session-info")) ?? "{}"
      )
    ).toEqual({});
  });

  it("swallows the exception if the fetch to the session endpoint fails", async () => {
    mockOidcClient();
    mockLocalStorage({});
    window.fetch = (
      jest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .fn() as any
    )
      .mockResolvedValueOnce(
        new Response("https://my.webid", {
          status: 200,
        })
      )
      .mockRejectedValueOnce("Some error");

    const mockedStorage = mockStorageUtility({
      "solidClientAuthenticationUser:mySession": {
        issuer: "some dummy test Issuer",
      },
      "solidClientAuthenticationUser:oauth2_state_value": {
        sessionId: "mySession",
      },
    });

    const authCodeRedirectHandler = getAuthCodeRedirectHandler({
      storageUtility: mockedStorage,
    });

    await authCodeRedirectHandler.handle(
      "https://coolsite.com/?code=someCode&state=oauth2_state_value"
    );
    expect(
      JSON.parse(
        (await mockedStorage.get("tmp-resource-server-session-info")) ?? "{}"
      )
    ).toEqual({});
  });

  it("store nothing if the resource server does not recognize the user", async () => {
    mockOidcClient();
    mockLocalStorage({});
    // This mocks the fetch to the Resource Server session endpoint
    // Note: Currently, the endpoint only returns the WebID in plain/text, it could
    // be extended later to also provide the cookie expiration.
    mockFetch(
      new Response("", {
        status: 401,
      })
    );

    const mockedStorage = mockStorageUtility({
      "solidClientAuthenticationUser:mySession": {
        issuer: "some dummy test Issuer",
      },
      "solidClientAuthenticationUser:oauth2_state_value": {
        sessionId: "mySession",
      },
    });

    const authCodeRedirectHandler = getAuthCodeRedirectHandler({
      storageUtility: mockedStorage,
    });

    await authCodeRedirectHandler.handle(
      "https://coolsite.com/?code=someCode&state=oauth2_state_value"
    );
    expect(
      JSON.parse(
        (await mockedStorage.get("tmp-resource-server-session-info")) ?? "{}"
      )
    ).toEqual({});
  });
});
