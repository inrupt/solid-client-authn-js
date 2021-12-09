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

import { jest, it, describe, expect } from "@jest/globals";
import {
  IIssuerConfig,
  mockStorageUtility,
  StorageUtility,
  USER_SESSION_PREFIX,
  mockStorage,
} from "@inrupt/solid-client-authn-core";
import * as SolidClientAuthnCore from "@inrupt/solid-client-authn-core";
import { JWK, SignJWT, importJWK } from "jose";
import { EventEmitter } from "events";
import { LoginHandlerMock } from "./login/__mocks__/LoginHandler";
import {
  RedirectHandlerMock,
  RedirectHandlerResponse,
} from "./login/oidc/redirectHandler/__mocks__/RedirectHandler";
import { LogoutHandlerMock } from "./logout/__mocks__/LogoutHandler";
import { mockSessionInfoManager } from "./sessionInfo/__mocks__/SessionInfoManager";
import ClientAuthentication from "./ClientAuthentication";
import { KEY_CURRENT_SESSION } from "./constant";
import {
  mockDefaultIssuerConfigFetcher,
  mockIssuerConfigFetcher,
} from "./login/oidc/__mocks__/IssuerConfigFetcher";
import { LocalStorageMock } from "./storage/__mocks__/LocalStorage";

jest.mock("@inrupt/solid-client-authn-core", () => {
  const actualCoreModule = jest.requireActual(
    "@inrupt/solid-client-authn-core"
  ) as typeof SolidClientAuthnCore;
  return {
    ...actualCoreModule,
    fetchJwks: jest.fn(),
  };
});

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

const mockAnotherJwk = (): JWK => {
  return {
    kty: "EC",
    kid: "oOArcXxcwvsaG21jAx_D5CHr4BgVCzCEtlfmNFQtU0s",
    alg: "ES256",
    crv: "P-256",
    x: "0dGe_s-urLhD3mpqYqmSXriUZApVV5ZNxMJXg7Vp-2A",
    y: "-oMe9gGkpfIr1J0aiSUHMdjqYVm5ZrGCeQmRKoIIfj8",
    d: "yR1bCsR8m4hjFCvWo8Jw3OfNR4aiYDAFbBD9nkudJKM",
  };
};

const mockIdTokenPayload = (
  subject: string,
  issuer: string,
  audience: string
): Record<string, string | number> => {
  return {
    sub: subject,
    iss: issuer,
    aud: audience,
    exp: 1662266216,
    iat: 1462266216,
  };
};

type SessionStorageOptions = {
  clientId: string;
  issuer: string;
};

const mockSessionStorage = async (
  sessionId: string,
  idTokenPayload: Record<string, string | number> = {},
  options: SessionStorageOptions = {
    clientId: "https://some.app/registration",
    issuer: "https://some.issuer",
  }
): Promise<StorageUtility> => {
  return new StorageUtility(
    mockStorage({
      [`${USER_SESSION_PREFIX}:${sessionId}`]: {
        isLoggedIn: "true",
        webId: "https://my.pod/profile#me",
      },
    }),
    mockStorage({
      [`${USER_SESSION_PREFIX}:${sessionId}`]: {
        idToken: await new SignJWT(idTokenPayload)
          .setProtectedHeader({
            alg: "ES256",
          })
          .setIssuedAt()
          .sign(await importJWK(mockJwk()), {}),
        clientId: options.clientId,
        issuer: options.issuer,
      },
    })
  );
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

describe("ClientAuthentication", () => {
  const defaultMocks = {
    loginHandler: LoginHandlerMock,
    redirectHandler: RedirectHandlerMock,
    logoutHandler: LogoutHandlerMock,
    sessionInfoManager: mockSessionInfoManager(mockStorageUtility({})),
    issuerConfigFetcher: mockDefaultIssuerConfigFetcher(),
  };

  function getClientAuthentication(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): ClientAuthentication {
    return new ClientAuthentication(
      mocks.loginHandler ?? defaultMocks.loginHandler,
      mocks.redirectHandler ?? defaultMocks.redirectHandler,
      mocks.logoutHandler ?? defaultMocks.logoutHandler,
      mocks.sessionInfoManager ?? defaultMocks.sessionInfoManager,
      mocks.issuerConfigFetcher ?? defaultMocks.issuerConfigFetcher
    );
  }

  describe("login", () => {
    const mockEmitter = new EventEmitter();

    it("calls login, and defaults to a DPoP token", async () => {
      const clientAuthn = getClientAuthentication();
      await clientAuthn.login(
        {
          sessionId: "mySession",
          tokenType: "DPoP",
          clientId: "coolApp",
          redirectUrl: "https://coolapp.com/redirect",
          oidcIssuer: "https://idp.com",
        },
        mockEmitter
      );
      expect(defaultMocks.loginHandler.handle).toHaveBeenCalledWith({
        sessionId: "mySession",
        clientId: "coolApp",
        redirectUrl: "https://coolapp.com/redirect",
        oidcIssuer: "https://idp.com",
        clientName: "coolApp",
        clientSecret: undefined,
        handleRedirect: undefined,
        eventEmitter: mockEmitter,
        tokenType: "DPoP",
      });
    });

    it("request a bearer token if specified", async () => {
      const clientAuthn = getClientAuthentication();
      await clientAuthn.login(
        {
          sessionId: "mySession",
          clientId: "coolApp",
          redirectUrl: "https://coolapp.com/redirect",
          oidcIssuer: "https://idp.com",
          tokenType: "Bearer",
        },
        mockEmitter
      );
      expect(defaultMocks.loginHandler.handle).toHaveBeenCalledWith({
        sessionId: "mySession",
        clientId: "coolApp",
        redirectUrl: "https://coolapp.com/redirect",
        oidcIssuer: "https://idp.com",
        clientName: "coolApp",
        clientSecret: undefined,
        handleRedirect: undefined,
        eventEmitter: mockEmitter,
        tokenType: "Bearer",
      });
    });

    it("should clear the local storage when logging in", async () => {
      const nonEmptyStorage = mockStorageUtility({
        someUser: { someKey: "someValue" },
      });
      await nonEmptyStorage.setForUser(
        "someUser",
        { someKey: "someValue" },
        { secure: true }
      );
      const clientAuthn = getClientAuthentication({
        sessionInfoManager: mockSessionInfoManager(nonEmptyStorage),
      });
      await clientAuthn.login(
        {
          sessionId: "someUser",
          tokenType: "DPoP",
          clientId: "coolApp",
          clientName: "coolApp Name",
          redirectUrl: "https://coolapp.com/redirect",
          oidcIssuer: "https://idp.com",
        },
        mockEmitter
      );
      await expect(
        nonEmptyStorage.getForUser("someUser", "someKey", { secure: true })
      ).resolves.toBeUndefined();
      await expect(
        nonEmptyStorage.getForUser("someUser", "someKey", { secure: false })
      ).resolves.toBeUndefined();
      // This test is only necessary until the key is stored safely
      await expect(
        nonEmptyStorage.get("clientKey", { secure: false })
      ).resolves.toBeUndefined();
    });
  });

  describe("fetch", () => {
    it("calls fetch", async () => {
      window.fetch = jest.fn();
      const clientAuthn = getClientAuthentication();
      await clientAuthn.fetch("https://html5zombo.com");
      expect(window.fetch).toHaveBeenCalledWith(
        "https://html5zombo.com",
        undefined
      );
    });
  });

  describe("logout", () => {
    const mockEmitter = new EventEmitter();

    it("reverts back to un-authenticated fetch on logout", async () => {
      window.fetch = jest.fn();
      // eslint-disable-next-line no-restricted-globals
      history.replaceState = jest.fn();
      const clientAuthn = getClientAuthentication();

      const unauthFetch = clientAuthn.fetch;

      const url =
        "https://coolapp.com/redirect?state=userId&id_token=idToken&access_token=accessToken";
      await clientAuthn.handleIncomingRedirect(url, mockEmitter);

      // Calling the redirect handler should give us an authenticated fetch.
      expect(clientAuthn.fetch).not.toBe(unauthFetch);

      await clientAuthn.logout("mySession");
      const spyFetch = jest.spyOn(window, "fetch");
      await clientAuthn.fetch("https://example.com", {
        credentials: "omit",
      });
      // Calling logout should revert back to our un-authenticated fetch.
      expect(clientAuthn.fetch).toBe(unauthFetch);
      expect(spyFetch).toHaveBeenCalledWith("https://example.com", {
        credentials: "omit",
      });
    });
  });

  describe("getAllSessionInfo", () => {
    it("creates a session for the global user", async () => {
      const clientAuthn = getClientAuthentication();
      await expect(() => clientAuthn.getAllSessionInfo()).rejects.toThrow(
        "Not implemented"
      );
    });
  });

  describe("getSessionInfo", () => {
    it("creates a session for the global user", async () => {
      const sessionInfo = {
        isLoggedIn: "true",
        sessionId: "mySession",
        webId: "https://pod.com/profile/card#me",
      };
      const clientAuthn = getClientAuthentication({
        sessionInfoManager: mockSessionInfoManager(
          mockStorageUtility(
            {
              "solidClientAuthenticationUser:mySession": { ...sessionInfo },
            },
            true
          )
        ),
      });
      const session = await clientAuthn.getSessionInfo("mySession");
      // isLoggedIn is stored as a string under the hood, but deserialized as a boolean
      expect(session).toEqual({
        ...sessionInfo,
        isLoggedIn: true,
        tokenType: "DPoP",
      });
    });
  });

  describe("handleIncomingRedirect", () => {
    const mockEmitter = new EventEmitter();

    it("calls handle redirect", async () => {
      // eslint-disable-next-line no-restricted-globals
      history.replaceState = jest.fn();
      const clientAuthn = getClientAuthentication();
      const unauthFetch = clientAuthn.fetch;
      const url =
        "https://coolapp.com/redirect?state=userId&id_token=idToken&access_token=accessToken";
      const redirectInfo = await clientAuthn.handleIncomingRedirect(
        url,
        mockEmitter
      );

      // Our injected mocked response may also contain internal-only data (for
      // other tests), whereas our response from `handleIncomingRedirect()` can
      // only contain publicly visible fields. So we need to explicitly check
      // for individual fields (as opposed to just checking against
      // entire-response-object-equality).
      expect(redirectInfo?.sessionId).toEqual(
        RedirectHandlerResponse.sessionId
      );
      expect(redirectInfo?.webId).toEqual(RedirectHandlerResponse.webId);
      expect(redirectInfo?.isLoggedIn).toEqual(
        RedirectHandlerResponse.isLoggedIn
      );
      expect(redirectInfo?.expirationDate).toEqual(
        RedirectHandlerResponse.expirationDate
      );
      expect(defaultMocks.redirectHandler.handle).toHaveBeenCalledWith(
        url,
        mockEmitter
      );

      // Calling the redirect handler should have updated the fetch.
      expect(clientAuthn.fetch).not.toBe(unauthFetch);
    });

    it("clears the current IRI from OAuth query parameters in the auth code flow", async () => {
      // eslint-disable-next-line no-restricted-globals
      history.replaceState = jest.fn();
      const clientAuthn = getClientAuthentication();
      const url =
        "https://coolapp.com/redirect?state=someState&code=someAuthCode";
      await clientAuthn.handleIncomingRedirect(url, mockEmitter);
      // eslint-disable-next-line no-restricted-globals
      expect(history.replaceState).toHaveBeenCalledWith(
        null,
        "",
        "https://coolapp.com/redirect"
      );
    });

    it("clears the current IRI from OAuth query parameters in the implicit flow", async () => {
      // eslint-disable-next-line no-restricted-globals
      history.replaceState = jest.fn();
      const clientAuthn = getClientAuthentication();
      const url =
        "https://coolapp.com/redirect?state=someState&id_token=idToken&access_token=accessToken";
      await clientAuthn.handleIncomingRedirect(url, mockEmitter);
      // eslint-disable-next-line no-restricted-globals
      expect(history.replaceState).toHaveBeenCalledWith(
        null,
        "",
        "https://coolapp.com/redirect"
      );
    });

    it("preserves non-OAuth query strings", async () => {
      // eslint-disable-next-line no-restricted-globals
      history.replaceState = jest.fn();
      const clientAuthn = getClientAuthentication();
      const url =
        "https://coolapp.com/redirect?state=someState&code=someAuthCode&someQuery=someValue";
      await clientAuthn.handleIncomingRedirect(url, mockEmitter);
      // eslint-disable-next-line no-restricted-globals
      expect(history.replaceState).toHaveBeenCalledWith(
        null,
        "",
        "https://coolapp.com/redirect?someQuery=someValue"
      );
    });
  });

  describe("getCurrentIssuer", () => {
    // In the following describe block, (window as any) is used
    // multiple types to override the window type definition and
    // allow localStorage to be written.
    it("returns null no current session is in storage", async () => {
      const clientAuthn = getClientAuthentication({});

      await expect(clientAuthn.validateCurrentSession()).resolves.toBeNull();
    });

    it("returns null if the current session has no stored issuer", async () => {
      const sessionId = "mySession";
      mockLocalStorage({
        [KEY_CURRENT_SESSION]: sessionId,
      });

      const mockedStorage = new StorageUtility(
        mockStorage({
          [`${USER_SESSION_PREFIX}:${sessionId}`]: {
            isLoggedIn: "true",
          },
        }),
        mockStorage({
          [`${USER_SESSION_PREFIX}:${sessionId}`]: {
            clientId: "https://some.app/registration",
            idToken: "some.id.token",
          },
        })
      );
      const clientAuthn = getClientAuthentication({
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });

      await expect(clientAuthn.validateCurrentSession()).resolves.toBeNull();
    });

    it("returns null if the current session has no stored ID token", async () => {
      const sessionId = "mySession";
      mockLocalStorage({
        [KEY_CURRENT_SESSION]: sessionId,
      });

      const mockedStorage = new StorageUtility(
        mockStorage({
          [`${USER_SESSION_PREFIX}:${sessionId}`]: {
            isLoggedIn: "true",
            issuer: "https://some.issuer",
          },
        }),
        mockStorage({
          [`${USER_SESSION_PREFIX}:${sessionId}`]: {
            clientId: "https://some.app/registration",
          },
        })
      );
      const clientAuthn = getClientAuthentication({
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });

      await expect(clientAuthn.validateCurrentSession()).resolves.toBeNull();
    });

    it("returns null if the current session has no stored client ID", async () => {
      const sessionId = "mySession";
      mockLocalStorage({
        [KEY_CURRENT_SESSION]: sessionId,
      });
      const mockedStorage = new StorageUtility(
        mockStorage({
          [`${USER_SESSION_PREFIX}:${sessionId}`]: {
            isLoggedIn: "true",
            issuer: "https://some.issuer",
          },
        }),
        mockStorage({
          [`${USER_SESSION_PREFIX}:${sessionId}`]: {
            idToken: "some.id.token",
          },
        })
      );
      const clientAuthn = getClientAuthentication({
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });

      await expect(clientAuthn.validateCurrentSession()).resolves.toBeNull();
    });

    it("returns null if the issuer does not have a JWKS", async () => {
      const sessionId = "mySession";
      mockLocalStorage({
        [KEY_CURRENT_SESSION]: sessionId,
      });
      const mockedIssuerConfig = mockIssuerConfigFetcher({} as IIssuerConfig);

      const mockedStorage = await mockSessionStorage(sessionId);

      const clientAuthn = getClientAuthentication({
        issuerConfigFetcher: mockedIssuerConfig,
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });

      await expect(clientAuthn.validateCurrentSession()).resolves.toBeNull();
    });

    it("returns null if the issuer's JWKS isn't available", async () => {
      const sessionId = "mySession";
      mockLocalStorage({
        [KEY_CURRENT_SESSION]: sessionId,
      });
      const mockedIssuerConfig = mockIssuerConfigFetcher({
        jwksUri: "https://some.issuer/jwks",
      } as IIssuerConfig);
      const mockedStorage = await mockSessionStorage(sessionId);
      const { fetchJwks } = SolidClientAuthnCore as jest.Mocked<
        typeof SolidClientAuthnCore
      >;
      fetchJwks.mockRejectedValueOnce("Not a valid JWK");

      const clientAuthn = getClientAuthentication({
        issuerConfigFetcher: mockedIssuerConfig,
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });

      await expect(clientAuthn.validateCurrentSession()).resolves.toBeNull();
    });

    it("returns null if the current issuer doesn't match the ID token's", async () => {
      const sessionId = "mySession";
      mockLocalStorage({
        [KEY_CURRENT_SESSION]: sessionId,
      });
      const mockedIssuerConfig = mockIssuerConfigFetcher({
        jwksUri: "https://some.issuer/jwks",
        issuer: "https://some.issuer",
      } as IIssuerConfig);
      const mockedStorage = await mockSessionStorage(
        sessionId,
        mockIdTokenPayload(
          "https://my.pod/profile#me",
          // The ID token issuer
          "https://some-other.issuer",
          "https://some.app/registration"
        ),
        {
          // The current issuer
          issuer: "https://some.issuer",
          clientId: "https://some.app/registration",
        }
      );

      const { fetchJwks } = SolidClientAuthnCore as jest.Mocked<
        typeof SolidClientAuthnCore
      >;
      fetchJwks.mockResolvedValueOnce(mockJwk());

      const clientAuthn = getClientAuthentication({
        issuerConfigFetcher: mockedIssuerConfig,
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });

      await expect(clientAuthn.validateCurrentSession()).resolves.toBeNull();
    });

    it("returns null if the current client ID doesn't match the ID token audience", async () => {
      const sessionId = "mySession";
      mockLocalStorage({
        [KEY_CURRENT_SESSION]: sessionId,
      });
      const mockedIssuerConfig = mockIssuerConfigFetcher({
        jwksUri: "https://some.issuer/jwks",
      } as IIssuerConfig);
      const mockedStorage = await mockSessionStorage(
        sessionId,
        mockIdTokenPayload(
          "https://my.pod/profile#me",
          "https://some.issuer",
          // The ID token audience
          "https://some-other.app/registration"
        ),
        {
          issuer: "https://some.issuer",
          // The current client ID
          clientId: "https://some.app/registration",
        }
      );
      const { fetchJwks } = SolidClientAuthnCore as jest.Mocked<
        typeof SolidClientAuthnCore
      >;
      fetchJwks.mockResolvedValueOnce(mockJwk());

      const clientAuthn = getClientAuthentication({
        issuerConfigFetcher: mockedIssuerConfig,
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });

      await expect(clientAuthn.validateCurrentSession()).resolves.toBeNull();
    });

    it("returns null if the ID token isn't signed with the keys of the issuer", async () => {
      const sessionId = "mySession";
      mockLocalStorage({
        [KEY_CURRENT_SESSION]: sessionId,
      });
      const mockedIssuerConfig = mockIssuerConfigFetcher({
        jwksUri: "https://some.issuer/jwks",
      } as IIssuerConfig);
      const mockedStorage = await mockSessionStorage(
        sessionId,
        mockIdTokenPayload(
          "https://my.pod/profile#me",
          "https://some.issuer",
          "https://some.app/registration"
        )
      );

      const { fetchJwks } = SolidClientAuthnCore as jest.Mocked<
        typeof SolidClientAuthnCore
      >;
      fetchJwks.mockResolvedValueOnce(mockAnotherJwk());

      const clientAuthn = getClientAuthentication({
        issuerConfigFetcher: mockedIssuerConfig,
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });

      await expect(clientAuthn.validateCurrentSession()).resolves.toBeNull();
    });
  });

  it("returns the issuer if the ID token is verified", async () => {
    const sessionId = "mySession";
    mockLocalStorage({
      [KEY_CURRENT_SESSION]: sessionId,
    });
    const mockedIssuerConfig = mockIssuerConfigFetcher({
      jwksUri: "https://some.issuer/jwks",
    } as IIssuerConfig);
    const mockedStorage = await mockSessionStorage(
      sessionId,
      mockIdTokenPayload(
        "https://my.pod/profile#me",
        "https://some.issuer",
        "https://some.app/registration"
      )
    );
    const { fetchJwks } = SolidClientAuthnCore as jest.Mocked<
      typeof SolidClientAuthnCore
    >;
    fetchJwks.mockResolvedValueOnce(mockJwk());

    const clientAuthn = getClientAuthentication({
      issuerConfigFetcher: mockedIssuerConfig,
      sessionInfoManager: mockSessionInfoManager(mockedStorage),
    });

    await expect(clientAuthn.validateCurrentSession()).resolves.toStrictEqual(
      expect.objectContaining({
        issuer: "https://some.issuer",
        clientAppId: "https://some.app/registration",
        sessionId,
        idToken: expect.anything(),
        webId: "https://my.pod/profile#me",
      })
    );
  });
});
