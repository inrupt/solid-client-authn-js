/*
 * Copyright 2020 Inrupt Inc.
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

import "reflect-metadata";
import {
  StorageUtilityMock,
  mockStorageUtility,
} from "@inrupt/solid-client-authn-core";
import { IdTokenClaims, TokenSet } from "openid-client";
import { JWK } from "jose";
import {
  AuthCodeRedirectHandler,
  deriveWebidFromTokenPayload,
} from "./AuthCodeRedirectHandler";
import { RedirectorMock } from "../__mocks__/Redirector";
import { mockSessionInfoManager } from "../../../sessionInfo/__mocks__/SessionInfoManager";
import {
  mockIssuerConfigFetcher,
  mockDefaultIssuerConfig,
} from "../__mocks__/IssuerConfigFetcher";
import { mockDefaultClientRegistrar } from "../__mocks__/ClientRegistrar";

jest.mock("openid-client");
jest.mock("cross-fetch");

const mockJwk = (): JWK.ECKey =>
  JWK.asKey({
    kty: "EC",
    kid: "oOArcXxcwvsaG21jAx_D5CHr4BgVCzCEtlfmNFQtU0s",
    alg: "ES256",
    crv: "P-256",
    x: "0dGe_s-urLhD3mpqYqmSXrqUZApVV5ZNxMJXg7Vp-2A",
    y: "-oMe9gGkpfIrnJ0aiSUHMdjqYVm5ZrGCeQmRKoIIfj8",
    d: "yR1bCsR7m4hjFCvWo8Jw3OfNR4aiYDAFbBD9nkudJKM",
  });

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

const mockKeyBoundToken = (): AccessJwt => {
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
  };
};

const mockDpopTokens = (): TokenSet => {
  return {
    access_token: JSON.stringify(mockKeyBoundToken()),
    id_token: mockIdToken(),
    token_type: "DPoP",
    expired: () => false,
    claims: mockIdTokenPayload,
  };
};

const defaultMocks = {
  storageUtility: StorageUtilityMock,
  redirector: RedirectorMock,
  sessionInfoManager: mockSessionInfoManager(mockStorageUtility({})),
  clientRegistrar: mockDefaultClientRegistrar(),
  issuerConfigFetcher: mockIssuerConfigFetcher(mockDefaultIssuerConfig()),
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
  describe("canHandler", () => {
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
        "[beep boop I am a robot] is not a valid URL, and cannot be used as a redirect URL"
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

  const mockDefaultRedirectStorage = () =>
    mockStorageUtility({
      "solidClientAuthenticationUser:someState": {
        sessionId: "mySession",
      },
      "solidClientAuthenticationUser:mySession": {
        issuer: "https://my.idp/",
        codeVerifier: "some code verifier",
        redirectUri: "https://my.app/redirect",
        dpop: "true",
      },
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

    it("properly performs DPoP token exchange", async () => {
      const { Issuer } = jest.requireMock("openid-client");
      function clientConstructor() {
        // this is untyped, which makes TS complain
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.callbackParams = jest.fn().mockReturnValueOnce({
          code: "someCode",
          state: "someState",
        });
        // this is untyped, which makes TS complain
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.callback = jest.fn().mockResolvedValueOnce(mockDpopTokens());
      }
      const mockedIssuer = {
        metadata: mockDefaultIssuerConfig(),
        Client: clientConstructor,
      };
      Issuer.mockReturnValueOnce(mockedIssuer);
      const mockedStorage = mockDefaultRedirectStorage();

      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockedStorage,
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });

      const result = await authCodeRedirectHandler.handle(
        "https://my.app/redirect?code=someCode&state=someState"
      );

      // Check that the returned session is the one we expected
      expect(result.sessionId).toEqual("mySession");
      expect(result.isLoggedIn).toEqual(true);
      expect(result.webId).toEqual(mockWebId());

      // Check that the session information is stored in the provided storage
      await expect(
        mockedStorage.getForUser("mySession", "webId", { secure: true })
      ).resolves.toEqual(mockWebId());
      await expect(
        mockedStorage.getForUser("mySession", "isLoggedIn", { secure: true })
      ).resolves.toEqual("true");

      // Check that the returned fetch function is authenticated
      const mockedFetch = jest.requireMock("cross-fetch");
      mockedFetch.mockResolvedValueOnce({} as Response);
      await result.fetch("https://some.url");
      expect(mockedFetch.mock.calls[0][1].headers.Authorization).toContain(
        "DPoP"
      );
    });

    it("properly performs Bearer token exchange", async () => {
      // Sets up the mock-up for token exchange
      const { Issuer } = jest.requireMock("openid-client");
      function clientConstructor() {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.callbackParams = jest.fn().mockReturnValueOnce({
          code: "someCode",
          state: "someState",
        });
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.callback = jest.fn().mockResolvedValueOnce(
          // NB: Here, a bearer token is returned
          mockBearerTokens()
        );
      }
      const mockedIssuer = {
        metadata: mockDefaultIssuerConfig(),
        Client: clientConstructor,
      };
      Issuer.mockReturnValueOnce(mockedIssuer);
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
        "https://my.app/redirect?code=someCode&state=someState"
      );

      // Check that the returned fetch function is authenticated
      const mockedFetch = jest.requireMock("cross-fetch");
      mockedFetch.mockResolvedValueOnce({} as Response);
      await result.fetch("https://some.url");
      expect(mockedFetch.mock.calls[0][1].headers.Authorization).toContain(
        "Bearer"
      );
    });

    it("stores the refresh token if one is returned", async () => {
      // Sets up the mock-up for token exchange
      const { Issuer } = jest.requireMock("openid-client");
      function clientConstructor() {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.callbackParams = jest.fn().mockReturnValueOnce({
          code: "someCode",
          state: "someState",
        });
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.callback = jest.fn().mockResolvedValueOnce({
          ...mockDpopTokens(),
          // NB: a refresh token is returned, unlike in the default case.
          refresh_token: "some refresh token",
        });
      }
      const mockedIssuer = {
        metadata: mockDefaultIssuerConfig(),
        Client: clientConstructor,
      };
      Issuer.mockReturnValueOnce(mockedIssuer);
      const mockedStorage = mockDefaultRedirectStorage();

      // Run the test
      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockedStorage,
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });

      await authCodeRedirectHandler.handle(
        "https://my.app/redirect?code=someCode&state=someState"
      );

      // Check that the session information is stored in the provided storage
      await expect(
        mockedStorage.getForUser("mySession", "refreshToken", { secure: true })
      ).resolves.toEqual("some refresh token");
    });

    it("throws if the IdP does not return an access token", async () => {
      // Sets up the mock-up for token exchange
      const { Issuer } = jest.requireMock("openid-client");
      function clientConstructor() {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.callbackParams = jest.fn().mockReturnValueOnce({
          code: "someCode",
          state: "someState",
        });
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.callback = jest.fn().mockResolvedValueOnce({
          ...mockDpopTokens(),
          // NB: This overrides the expected value
          access_token: undefined,
        });
      }
      const mockedIssuer = {
        metadata: mockDefaultIssuerConfig(),
        Client: clientConstructor,
      };
      Issuer.mockReturnValueOnce(mockedIssuer);
      const mockedStorage = mockDefaultRedirectStorage();

      // Run the test
      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockedStorage,
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });

      await expect(
        authCodeRedirectHandler.handle(
          "https://my.app/redirect?code=someCode&state=someState"
        )
      ).rejects.toThrow("The IdP did not return the expected tokens.");
    });

    it("throws if the IdP does not return an ID token", async () => {
      // Sets up the mock-up for token exchange
      const { Issuer } = jest.requireMock("openid-client");
      function clientConstructor() {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.callbackParams = jest.fn().mockReturnValueOnce({
          code: "someCode",
          state: "someState",
        });
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.callback = jest.fn().mockResolvedValueOnce({
          ...mockDpopTokens(),
          // NB: This overrides the expected value
          id_token: undefined,
        });
      }
      const mockedIssuer = {
        metadata: mockDefaultIssuerConfig(),
        Client: clientConstructor,
      };
      Issuer.mockReturnValueOnce(mockedIssuer);
      const mockedStorage = mockDefaultRedirectStorage();

      // Run the test
      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockedStorage,
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });

      await expect(
        authCodeRedirectHandler.handle(
          "https://my.app/redirect?code=someCode&state=someState"
        )
      ).rejects.toThrow("The IdP did not return the expected tokens.");
    });

    it("throws if no stored state matches the current request's", async () => {
      const mockedStorage = mockStorageUtility({
        "solidClientAuthenticationUser:mySession": {
          issuer: "https://my.idp/",
          codeVerifier: "some code verifier",
          redirectUri: "https://my.app/redirect",
          dpop: "true",
        },
      });

      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockedStorage,
      });

      await expect(
        authCodeRedirectHandler.handle(
          "https://my.app/redirect?code=someCode&state=someState"
        )
      ).rejects.toThrow(
        "Could not retrieve the OIDC context from storage for request associated to state"
      );
    });

    it("throws if no issuer is stored for the user", async () => {
      const mockedStorage = mockStorageUtility({
        "solidClientAuthenticationUser:someState": {
          sessionId: "mySession",
        },
        "solidClientAuthenticationUser:mySession": {
          codeVerifier: "some code verifier",
          redirectUri: "https://my.app/redirect",
          dpop: "true",
        },
      });

      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockedStorage,
      });

      await expect(
        authCodeRedirectHandler.handle(
          "https://my.app/redirect?code=someCode&state=someState"
        )
      ).rejects.toThrow(
        "Could not retrieve the OIDC context from storage for request associated to state"
      );
    });

    it("throws if no code verifier is stored for the user", async () => {
      const mockedStorage = mockStorageUtility({
        "solidClientAuthenticationUser:someState": {
          sessionId: "mySession",
        },
        "solidClientAuthenticationUser:mySession": {
          issuer: "https://my.idp/",
          redirectUri: "https://my.app/redirect",
          dpop: "true",
        },
      });

      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockedStorage,
      });

      await expect(
        authCodeRedirectHandler.handle(
          "https://my.app/redirect?code=someCode&state=someState"
        )
      ).rejects.toThrow(
        "Could not retrieve the OIDC context from storage for request associated to state"
      );
    });

    it("throws if no redirect uri is stored for the user", async () => {
      const mockedStorage = mockStorageUtility({
        "solidClientAuthenticationUser:someState": {
          sessionId: "mySession",
        },
        "solidClientAuthenticationUser:mySession": {
          issuer: "https://my.idp/",
          codeVerifier: "some code verifier",
          dpop: "true",
        },
      });

      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockedStorage,
      });

      await expect(
        authCodeRedirectHandler.handle(
          "https://my.app/redirect?code=someCode&state=someState"
        )
      ).rejects.toThrow(
        "Could not retrieve the OIDC context from storage for request associated to state"
      );
    });

    it("throws if no token type is stored for the user", async () => {
      const mockedStorage = mockStorageUtility({
        "solidClientAuthenticationUser:someState": {
          sessionId: "mySession",
        },
        "solidClientAuthenticationUser:mySession": {
          issuer: "https://my.idp/",
          codeVerifier: "some code verifier",
          redirectUri: "https://my.app/redirect",
        },
      });

      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockedStorage,
      });

      await expect(
        authCodeRedirectHandler.handle(
          "https://my.app/redirect?code=someCode&state=someState"
        )
      ).rejects.toThrow(
        "Could not retrieve the OIDC context from storage for request associated to state"
      );
    });

    it("throws if the Session manager cannot retrieve the session info", async () => {
      // Sets up the mock-up for token exchange
      const { Issuer } = jest.requireMock("openid-client");
      function clientConstructor() {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.callbackParams = jest.fn().mockReturnValueOnce({
          code: "someCode",
          state: "someState",
        });
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.callback = jest.fn().mockResolvedValueOnce(mockDpopTokens());
      }
      const mockedIssuer = {
        metadata: mockDefaultIssuerConfig(),
        Client: clientConstructor,
      };
      Issuer.mockReturnValueOnce(mockedIssuer);
      const mockedStorage = mockDefaultRedirectStorage();
      const mockedSessionManager = mockSessionInfoManager(mockedStorage);
      mockedSessionManager.get = jest.fn().mockReturnValue(undefined);

      // Run the test
      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: mockedStorage,
        sessionInfoManager: mockedSessionManager,
      });

      await expect(
        authCodeRedirectHandler.handle(
          "https://my.app/redirect?code=someCode&state=someState"
        )
      ).rejects.toThrow("Could not retrieve session: [mySession]");
    });
  });

  describe("deriveWebidFromTokenPayload", () => {
    it("extracts a WebID from a custom webid claim", async () => {
      await expect(
        deriveWebidFromTokenPayload({
          webid: "https://my.webid/",
          sub: "some sub",
          iss: "https://my.idp/",
          aud: "https://resource.example.org",
          exp: 1662266216,
          iat: 1462266216,
        })
      ).resolves.toEqual("https://my.webid/");
    });

    it("extracts a WebID from an IRI-like sub claim", async () => {
      await expect(
        deriveWebidFromTokenPayload({
          sub: "https://my.webid/",
          iss: "https://my.idp/",
          aud: "https://resource.example.org",
          exp: 1662266216,
          iat: 1462266216,
        })
      ).resolves.toEqual("https://my.webid/");
    });

    it("throws if a WebID cannot be extracted", async () => {
      await expect(
        deriveWebidFromTokenPayload({
          sub: "some sub",
          iss: "https://my.idp/",
          aud: "https://resource.example.org",
          exp: 1662266216,
          iat: 1462266216,
        })
      ).rejects.toThrow(
        "The ID token has a malformed 'sub' claim ([some sub]), and no 'webid' claim."
      );
    });
  });
});
