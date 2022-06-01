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

import { jest, it, describe, expect } from "@jest/globals";
import {
  EVENTS,
  ISessionInfo,
  StorageUtility,
  USER_SESSION_PREFIX,
} from "@inrupt/solid-client-authn-core";
import { mockClientAuthentication } from "./__mocks__/ClientAuthentication";
import { Session } from "./Session";
import { mockStorage } from "../../core/src/storage/__mocks__/StorageUtility";
import { LocalStorageMock } from "./storage/__mocks__/LocalStorage";
import { mockSessionInfoManager } from "./sessionInfo/__mocks__/SessionInfoManager";
import { KEY_CURRENT_SESSION, KEY_CURRENT_URL } from "./constant";

/* eslint-disable @typescript-eslint/ban-ts-comment */

const mockLocalStorage = (stored: Record<string, string>) => {
  Object.defineProperty(window, "localStorage", {
    value: new LocalStorageMock(stored),
    writable: true,
  });
};

const mockLocation = (mockedLocation: string) => {
  // We can't simply do 'window.location.href = defaultLocation;', as that
  // causes our test environment to try to navigate to the new location (as
  // a browser would do). So instead we need to reset 'window.location' as a
  // whole, and reset it's value after our test. We also need to
  // replace the 'history' object, otherwise this error happens: "SecurityError:
  // replaceState cannot update history to a URL which differs in components other
  // than in path, query, or fragment.""

  // (window as any) is used to override the window type definition and
  // allow location to be written.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any).location;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any).history.replaceState;

  // Set our window's location to our test value.
  window.location = {
    href: mockedLocation,
  } as Location;
  window.history.replaceState = jest.fn();
};

describe("Session", () => {
  describe("constructor", () => {
    it("accepts an empty config", async () => {
      const mySession = new Session({});
      expect(mySession.info.isLoggedIn).toBe(false);
      expect(mySession.info.sessionId).toBeDefined();
    });

    it("accepts no config", async () => {
      const mySession = new Session();
      expect(mySession.info.isLoggedIn).toBe(false);
      expect(mySession.info.sessionId).toBeDefined();
    });

    it("does not generate a session ID if one is provided", () => {
      const mySession = new Session({}, "mySession");
      expect(mySession.info.sessionId).toBe("mySession");
    });

    it("accepts input storage", async () => {
      const insecureStorage = mockStorage({});
      const secureStorage = mockStorage({});
      const mySession = new Session({
        insecureStorage,
        secureStorage,
      });
      const clearSecureStorage = jest.spyOn(secureStorage, "delete");
      const clearInsecureStorage = jest.spyOn(insecureStorage, "delete");
      await mySession.logout();
      expect(clearSecureStorage).toHaveBeenCalled();
      expect(clearInsecureStorage).toHaveBeenCalled();
    });

    it("accepts session info", () => {
      const mySession = new Session({
        sessionInfo: {
          sessionId: "mySession",
          isLoggedIn: false,
          webId: "https://some.webid",
        },
      });
      expect(mySession.info.isLoggedIn).toBe(false);
      expect(mySession.info.sessionId).toBe("mySession");
      expect(mySession.info.webId).toBe("https://some.webid");
    });

    it("does not reference window immediately", () => {
      // Let's make TypeScript and eslint angry! We'll set our window mock to
      // undefined so that any references to its properties or methods explode.
      // @ts-ignore-start
      // eslint-disable-next-line no-global-assign
      window = undefined;
      // @ts-ignore-end
      expect(() => {
        // eslint-disable-next-line no-new
        new Session({});
      }).not.toThrow();
    });
  });

  describe("login", () => {
    it("wraps up ClientAuthentication login", () => {
      const clientAuthentication = mockClientAuthentication();
      const clientAuthnLogin = jest.spyOn(clientAuthentication, "login");
      const mySession = new Session({ clientAuthentication });
      // login never resolves if there are no errors,
      // because a login redirects the user away from the page:
      // eslint-disable-next-line no-void
      void mySession.login({});
      expect(clientAuthnLogin).toHaveBeenCalled();
    });

    it("Uses the token type provided (if any)", () => {
      const clientAuthentication = mockClientAuthentication();
      const clientAuthnLogin = jest.spyOn(clientAuthentication, "login");
      const mySession = new Session({ clientAuthentication });
      // login never resolves if there are no errors,
      // because a login redirects the user away from the page:
      // eslint-disable-next-line no-void
      void mySession.login({
        tokenType: "Bearer",
      });
      expect(clientAuthnLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenType: "Bearer",
        }),
        mySession
      );
    });

    it("preserves a binding to its Session instance", () => {
      const clientAuthentication = mockClientAuthentication();
      const clientAuthnLogin = jest.spyOn(clientAuthentication, "login");
      const mySession = new Session({ clientAuthentication });
      const objectWithLogin = {
        login: mySession.login,
      };
      // login never resolves if there are no errors,
      // because a login redirects the user away from the page:
      // eslint-disable-next-line no-void
      void objectWithLogin.login({});
      expect(clientAuthnLogin).toHaveBeenCalled();
    });
  });

  describe("logout", () => {
    it("wraps up ClientAuthentication logout", async () => {
      const clientAuthentication = mockClientAuthentication();
      const clientAuthnLogout = jest.spyOn(clientAuthentication, "logout");
      const mySession = new Session({ clientAuthentication });
      await mySession.logout();
      expect(clientAuthnLogout).toHaveBeenCalled();
    });

    it("preserves a binding to its Session instance", async () => {
      const clientAuthentication = mockClientAuthentication();
      const clientAuthnLogout = jest.spyOn(clientAuthentication, "logout");
      const mySession = new Session({ clientAuthentication });
      const objectWithLogout = {
        logout: mySession.logout,
      };
      await objectWithLogout.logout();
      expect(clientAuthnLogout).toHaveBeenCalled();
    });

    it("updates the session's info", async () => {
      const clientAuthentication = mockClientAuthentication();
      const mySession = new Session({ clientAuthentication });
      mySession.info.isLoggedIn = true;
      await mySession.logout();
      expect(mySession.info.isLoggedIn).toBe(false);
    });
  });

  describe("fetch", () => {
    it("wraps up ClientAuthentication fetch if logged in", async () => {
      window.fetch = jest.fn();
      const clientAuthentication = mockClientAuthentication();
      const clientAuthnFetch = jest.spyOn(clientAuthentication, "fetch");
      const mySession = new Session({ clientAuthentication });
      mySession.info.isLoggedIn = true;
      await mySession.fetch("https://some.url");
      expect(clientAuthnFetch).toHaveBeenCalled();
    });

    it("preserves a binding to its Session instance", async () => {
      window.fetch = jest.fn();
      const clientAuthentication = mockClientAuthentication();
      const clientAuthnFetch = jest.spyOn(clientAuthentication, "fetch");
      const mySession = new Session({ clientAuthentication });
      mySession.info.isLoggedIn = true;
      const objectWithFetch = {
        fetch: mySession.fetch,
      };
      await objectWithFetch.fetch("https://some.url");
      expect(clientAuthnFetch).toHaveBeenCalled();
    });

    it("does not rebind window.fetch if logged out", async () => {
      window.fetch = jest.fn();
      const clientAuthentication = mockClientAuthentication();
      const mySession = new Session({ clientAuthentication });
      await mySession.fetch("https://some.url/");
      expect(window.fetch).toHaveBeenCalled();
      expect((window.fetch as jest.Mock).mock.instances).toEqual([window]);
    });
  });

  describe("handleIncomingRedirect", () => {
    it("uses current window location as default redirect URL", async () => {
      mockLocation("https://some.url");
      const clientAuthentication = mockClientAuthentication();
      const incomingRedirectHandler = jest.spyOn(
        clientAuthentication,
        "handleIncomingRedirect"
      );

      const mySession = new Session({ clientAuthentication });
      await mySession.handleIncomingRedirect();
      expect(incomingRedirectHandler).toHaveBeenCalledWith(
        "https://some.url",
        mySession
      );
    });

    it("wraps up ClientAuthentication handleIncomingRedirect", async () => {
      mockLocation("https://some.url");
      const clientAuthentication = mockClientAuthentication();
      const incomingRedirectHandler = jest.spyOn(
        clientAuthentication,
        "handleIncomingRedirect"
      );
      const mySession = new Session({ clientAuthentication });
      await mySession.handleIncomingRedirect("https://some.url");
      expect(incomingRedirectHandler).toHaveBeenCalled();
    });

    it("updates the session's info if relevant", async () => {
      const clientAuthentication = mockClientAuthentication();
      clientAuthentication.handleIncomingRedirect = jest.fn(
        async (_url: string) => {
          return {
            isLoggedIn: true,
            sessionId: "a session ID",
            webId: "https://some.webid#them",
          };
        }
      );
      const mySession = new Session({ clientAuthentication });
      expect(mySession.info.isLoggedIn).toBe(false);
      await mySession.handleIncomingRedirect("https://some.url");
      expect(mySession.info.isLoggedIn).toBe(true);
      expect(mySession.info.sessionId).toBe("a session ID");
      expect(mySession.info.webId).toBe("https://some.webid#them");
    });

    it("updates the localStorage if the login is completed", async () => {
      const clientAuthentication = mockClientAuthentication();
      clientAuthentication.handleIncomingRedirect = jest.fn(
        async (_url: string) => {
          return {
            isLoggedIn: true,
            sessionId: "a session ID",
            webId: "https://some.webid#them",
          };
        }
      );
      const mySession = new Session({ clientAuthentication });
      await mySession.handleIncomingRedirect("https://some.url");
      expect(window.localStorage.getItem(KEY_CURRENT_SESSION)).toBe(
        mySession.info.sessionId
      );
    });

    it("directly returns the session's info if already logged in", async () => {
      const clientAuthentication = mockClientAuthentication();
      clientAuthentication.handleIncomingRedirect = jest.fn(
        async (_url: string) => {
          return {
            isLoggedIn: true,
            sessionId: "a session ID",
            webId: "https://some.webid#them",
          };
        }
      );
      const mySession = new Session({ clientAuthentication });
      await mySession.handleIncomingRedirect("https://some.url");
      expect(mySession.info.isLoggedIn).toBe(true);
      await mySession.handleIncomingRedirect("https://some.url");
      // The second request should not hit the wrapped function
      expect(clientAuthentication.handleIncomingRedirect).toHaveBeenCalledTimes(
        1
      );
    });

    it("listens on the token extension signal to keep the expiration date accurate", async () => {
      jest.useFakeTimers();
      const MOCK_TIMESTAMP = 10000;
      jest.spyOn(Date, "now").mockReturnValueOnce(MOCK_TIMESTAMP);
      const clientAuthentication = mockClientAuthentication();
      const incomingRedirectHandler = jest.spyOn(
        clientAuthentication,
        "handleIncomingRedirect"
      );
      incomingRedirectHandler.mockResolvedValueOnce({
        isLoggedIn: true,
        sessionId: "Arbitrary session ID",
        expirationDate: MOCK_TIMESTAMP + 1337,
      });
      const mySession = new Session({ clientAuthentication });
      await mySession.handleIncomingRedirect("https://some.url");
      expect(mySession.info.expirationDate).toBe(MOCK_TIMESTAMP + 1337);
      mySession.emit(EVENTS.SESSION_EXTENDED, 1337 * 2);
      expect(mySession.info.expirationDate).toBe(
        MOCK_TIMESTAMP + 1337 * 2 * 1000
      );
    });

    it("leaves the session's info unchanged if no session is obtained after redirect", async () => {
      const clientAuthentication = mockClientAuthentication();
      clientAuthentication.handleIncomingRedirect = jest.fn(
        async (_url: string) => undefined
      );
      const mySession = new Session({ clientAuthentication }, "mySession");
      await mySession.handleIncomingRedirect("https://some.url");
      expect(mySession.info.isLoggedIn).toBe(false);
      expect(mySession.info.sessionId).toBe("mySession");
    });

    it("prevents from hitting the token endpoint twice with the same auth code", async () => {
      const clientAuthentication = mockClientAuthentication();
      const obtainedSession: ISessionInfo = {
        isLoggedIn: true,
        sessionId: "mySession",
      };
      let continueAfterSecondRequest: (value?: unknown) => void;
      const blockingResponse = new Promise((resolve, _reject) => {
        continueAfterSecondRequest = resolve;
      });
      const blockingRequest = async (): Promise<ISessionInfo> => {
        await blockingResponse;
        return obtainedSession;
      };
      // The ClientAuthn's handleIncomingRedirect will only return when the
      // second Session's handleIncomingRedirect has been called.
      clientAuthentication.handleIncomingRedirect = jest.fn(blockingRequest);
      const mySession = new Session({ clientAuthentication });
      const firstTokenRequest = mySession.handleIncomingRedirect(
        "https://my.app/?code=someCode&state=arizona"
      );
      const secondTokenRequest = mySession.handleIncomingRedirect(
        "https://my.app/?code=someCode&state=arizona"
      );
      // We know that it has been set by the call to `blockingRequest`.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      continueAfterSecondRequest!();
      const tokenRequests = await Promise.all([
        firstTokenRequest,
        secondTokenRequest,
      ]);
      // One of the two token requests should not have reached the token endpoint
      // because the other was pending.
      expect(tokenRequests).toContain(undefined);
    });

    it("preserves a binding to its Session instance", async () => {
      const clientAuthentication = mockClientAuthentication();
      const incomingRedirectHandler = jest.spyOn(
        clientAuthentication,
        "handleIncomingRedirect"
      );
      const mySession = new Session({ clientAuthentication });
      const objectWithHandleIncomingRedirect = {
        handleIncomingRedirect: mySession.handleIncomingRedirect,
      };
      await objectWithHandleIncomingRedirect.handleIncomingRedirect(
        "https://some.url"
      );
      expect(incomingRedirectHandler).toHaveBeenCalled();
    });
  });

  describe("onError", () => {
    it("calls the registered callback on error", async () => {
      const onErrorCallback = jest.fn();
      const mySession = new Session();
      mySession.onError(onErrorCallback);
      mySession.emit(EVENTS.ERROR, "error", "error_description");
      expect(onErrorCallback).toHaveBeenCalledWith(
        "error",
        "error_description"
      );
    });
  });

  describe("silent authentication", () => {
    it("does nothing if no previous session is available", async () => {
      mockLocalStorage({});
      mockLocation("https://mock.current/location");
      const mockedStorage = new StorageUtility(
        mockStorage({}),
        mockStorage({})
      );
      const clientAuthentication = mockClientAuthentication({
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });
      const incomingRedirectPromise = Promise.resolve();
      clientAuthentication.handleIncomingRedirect = jest
        .fn()
        .mockReturnValue(
          incomingRedirectPromise
        ) as typeof clientAuthentication.handleIncomingRedirect;
      const mySession = new Session({ clientAuthentication });
      // eslint-disable-next-line no-void
      void mySession.handleIncomingRedirect({
        url: "https://some.redirect/url",
        restorePreviousSession: true,
      });
      expect(window.localStorage.getItem(KEY_CURRENT_URL)).toBeNull();
    });

    it("saves current window location if the current session validates", async () => {
      const sessionId = "mySilentSession";
      mockLocalStorage({
        [KEY_CURRENT_SESSION]: sessionId,
      });
      mockLocation("https://mock.current/location");
      const mockedStorage = new StorageUtility(
        mockStorage({
          [`${USER_SESSION_PREFIX}:${sessionId}`]: {
            isLoggedIn: "true",
          },
        }),
        // No session information need to be mocked, because `validateCurrentSession`
        // itself is mocked.
        mockStorage({})
      );
      const clientAuthentication = mockClientAuthentication({
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });
      const incomingRedirectPromise = Promise.resolve();
      clientAuthentication.handleIncomingRedirect = jest
        .fn()
        .mockReturnValueOnce(
          incomingRedirectPromise
        ) as typeof clientAuthentication.handleIncomingRedirect;
      const validateCurrentSessionPromise = Promise.resolve(
        "https://some.issuer/"
      );
      clientAuthentication.validateCurrentSession = jest
        .fn()
        .mockReturnValue(
          validateCurrentSessionPromise
        ) as typeof clientAuthentication.validateCurrentSession;

      const mySession = new Session({ clientAuthentication });
      // eslint-disable-next-line no-void
      void mySession.handleIncomingRedirect({
        url: "https://some.redirect/url",
        restorePreviousSession: true,
      });
      await incomingRedirectPromise;
      await validateCurrentSessionPromise;
      expect(window.localStorage.getItem(KEY_CURRENT_URL)).toBe(
        "https://mock.current/location"
      );
    });

    it("does nothing if no ID token is available", async () => {
      const sessionId = "mySilentSession";
      mockLocalStorage({
        [KEY_CURRENT_SESSION]: sessionId,
      });
      mockLocation("https://mock.current/location");
      const mockedStorage = new StorageUtility(
        mockStorage({
          [`${USER_SESSION_PREFIX}:${sessionId}`]: {
            isLoggedIn: "true",
          },
        }),
        mockStorage({
          [`${USER_SESSION_PREFIX}:${sessionId}`]: {
            clientId: "value doesn't matter",
          },
        })
      );
      const clientAuthentication = mockClientAuthentication({
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });
      clientAuthentication.handleIncomingRedirect = (
        jest.fn() as any
      ).mockResolvedValue(
        undefined
      ) as typeof clientAuthentication.handleIncomingRedirect;
      const mySession = new Session({ clientAuthentication });
      // eslint-disable-next-line no-void
      void mySession.handleIncomingRedirect({
        url: "https://some.redirect/url",
        restorePreviousSession: true,
      });
      expect(window.localStorage.getItem(KEY_CURRENT_URL)).toBeNull();
    });

    it("triggers silent authentication if a valid ID token is stored", async () => {
      const sessionId = "mySession";
      mockLocalStorage({
        [KEY_CURRENT_SESSION]: sessionId,
      });
      mockLocation("https://mock.current/location");
      const mockedStorage = new StorageUtility(
        mockStorage({
          [`${USER_SESSION_PREFIX}:${sessionId}`]: {
            isLoggedIn: "true",
          },
        }),
        mockStorage({})
      );
      const clientAuthentication = mockClientAuthentication({
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });
      const validateCurrentSessionPromise = Promise.resolve({
        issuer: "https://some.issuer",
        clientAppId: "some client ID",
        clientAppSecret: "some client secret",
        redirectUrl: "https://some.redirect/url",
        tokenType: "DPoP",
      });
      clientAuthentication.validateCurrentSession = jest
        .fn()
        .mockReturnValue(
          validateCurrentSessionPromise
        ) as typeof clientAuthentication.validateCurrentSession;
      const incomingRedirectPromise = Promise.resolve();
      clientAuthentication.handleIncomingRedirect = jest
        .fn()
        .mockReturnValueOnce(
          incomingRedirectPromise
        ) as typeof clientAuthentication.handleIncomingRedirect;
      clientAuthentication.login = jest.fn();

      const mySession = new Session({ clientAuthentication });
      // eslint-disable-next-line no-void
      void mySession.handleIncomingRedirect({
        url: "https://some.redirect/url",
        restorePreviousSession: true,
      });
      await incomingRedirectPromise;
      await validateCurrentSessionPromise;
      expect(clientAuthentication.login).toHaveBeenCalledWith(
        {
          sessionId: "mySession",
          tokenType: "DPoP",
          oidcIssuer: "https://some.issuer",
          prompt: "none",
          clientId: "some client ID",
          clientSecret: "some client secret",
          redirectUrl: "https://some.redirect/url",
        },
        expect.anything()
      );
      // Check that second parameter is of type session
      expect(
        (clientAuthentication.login as any).mock.calls[0][1]
      ).toBeInstanceOf(Session);
    });

    it("resolves handleIncomingRedirect if silent authentication could not be started", async () => {
      const sessionId = "mySession";
      mockLocalStorage({
        [KEY_CURRENT_SESSION]: sessionId,
      });
      mockLocation("https://mock.current/location");
      const mockedStorage = new StorageUtility(
        mockStorage({
          [`${USER_SESSION_PREFIX}:${sessionId}`]: {
            isLoggedIn: "true",
          },
        }),
        mockStorage({})
      );
      const clientAuthentication = mockClientAuthentication({
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });
      const validateCurrentSessionPromise = Promise.resolve(null);
      clientAuthentication.validateCurrentSession = jest
        .fn()
        .mockReturnValue(
          validateCurrentSessionPromise
        ) as typeof clientAuthentication.validateCurrentSession;
      const incomingRedirectPromise = Promise.resolve();
      clientAuthentication.handleIncomingRedirect = jest
        .fn()
        .mockReturnValueOnce(
          incomingRedirectPromise
        ) as typeof clientAuthentication.handleIncomingRedirect;
      clientAuthentication.login = jest.fn();

      const mySession = new Session({ clientAuthentication });
      const handleIncomingRedirectPromise = mySession.handleIncomingRedirect({
        url: "https://arbitrary.redirect/url",
        restorePreviousSession: true,
      });
      await incomingRedirectPromise;
      await validateCurrentSessionPromise;
      await expect(handleIncomingRedirectPromise).resolves.not.toBeNull();
    });

    it("does nothing if the developer has not explicitly enabled silent authentication", async () => {
      const sessionId = "mySession";
      mockLocalStorage({
        [KEY_CURRENT_SESSION]: sessionId,
      });
      mockLocation("https://mock.current/location");
      const mockedStorage = new StorageUtility(
        mockStorage({
          [`${USER_SESSION_PREFIX}:${sessionId}`]: {
            isLoggedIn: "true",
          },
        }),
        mockStorage({})
      );
      const clientAuthentication = mockClientAuthentication({
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });
      clientAuthentication.validateCurrentSession = (
        jest.fn() as any
      ).mockResolvedValue({
        issuer: "https://some.issuer",
        clientAppId: "some client ID",
        clientAppSecret: "some client secret",
        redirectUrl: "https://some.redirect/url",
      }) as typeof clientAuthentication.validateCurrentSession;
      clientAuthentication.handleIncomingRedirect = (
        jest.fn() as any
      ).mockResolvedValue(
        undefined
      ) as typeof clientAuthentication.handleIncomingRedirect;
      clientAuthentication.login = jest.fn();

      const mySession = new Session({ clientAuthentication });
      // eslint-disable-next-line no-void
      void mySession.handleIncomingRedirect("https://some.redirect/url");
      expect(window.localStorage.getItem(KEY_CURRENT_URL)).toBeNull();
      expect(clientAuthentication.login).not.toHaveBeenCalled();
    });

    it("does nothing if the developer has disabled silent authentication", async () => {
      const sessionId = "mySession";
      mockLocalStorage({
        [KEY_CURRENT_SESSION]: sessionId,
      });
      mockLocation("https://mock.current/location");
      const mockedStorage = new StorageUtility(
        mockStorage({
          [`${USER_SESSION_PREFIX}:${sessionId}`]: {
            isLoggedIn: "true",
          },
        }),
        mockStorage({})
      );
      const clientAuthentication = mockClientAuthentication({
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });
      clientAuthentication.validateCurrentSession = (
        jest.fn() as any
      ).mockResolvedValue({
        issuer: "https://some.issuer",
        clientAppId: "some client ID",
        clientAppSecret: "some client secret",
        redirectUrl: "https://some.redirect/url",
      });
      clientAuthentication.handleIncomingRedirect = (
        jest.fn() as any
      ).mockResolvedValue(undefined);
      clientAuthentication.login = jest.fn();

      const mySession = new Session({ clientAuthentication });
      // eslint-disable-next-line no-void
      void mySession.handleIncomingRedirect({
        url: "https://some.redirect/url",
        restorePreviousSession: false,
      });
      expect(window.localStorage.getItem(KEY_CURRENT_URL)).toBeNull();
      expect(clientAuthentication.login).not.toHaveBeenCalled();
    });

    it("does not retry silent authentication if an authentication error happens", async () => {
      const sessionId = "mySession";
      // Pretend that we have a previously active session.
      mockLocalStorage({
        [KEY_CURRENT_SESSION]: sessionId,
      });
      mockLocation("https://mock.current/location");
      const mockedStorage = new StorageUtility(
        mockStorage({
          [`${USER_SESSION_PREFIX}:${sessionId}`]: {
            isLoggedIn: "true",
          },
        }),
        mockStorage({})
      );
      const clientAuthentication = mockClientAuthentication({
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });
      clientAuthentication.handleIncomingRedirect = jest
        .fn(clientAuthentication.handleIncomingRedirect)
        .mockImplementationOnce(async (_url, emitter) => {
          emitter.emit(EVENTS.ERROR, "Some authentication error");
          return {
            isLoggedIn: false,
            sessionId,
          };
        });
      clientAuthentication.login = jest.fn();

      const mySession = new Session({ clientAuthentication });
      // eslint-disable-next-line no-void
      void mySession.handleIncomingRedirect("https://some.redirect/url");
      expect(mySession.info.isLoggedIn).toBe(false);
      // The local storage should have been cleared by the auth error
      expect(window.localStorage.getItem(KEY_CURRENT_SESSION)).toBeNull();
      // Silent authentication should not have been attempted
      expect(clientAuthentication.login).not.toHaveBeenCalled();
    });

    it("clears the session ID from local storage if the session expired", async () => {
      const sessionId = "mySession";
      // Pretend that we have a previously active session.
      mockLocalStorage({
        [KEY_CURRENT_SESSION]: sessionId,
      });
      mockLocation("https://mock.current/location");
      const mockedStorage = new StorageUtility(
        mockStorage({
          [`${USER_SESSION_PREFIX}:${sessionId}`]: {
            isLoggedIn: "true",
          },
        }),
        mockStorage({})
      );
      const clientAuthentication = mockClientAuthentication({
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });

      const mySession = new Session({ clientAuthentication });
      mySession.emit(EVENTS.SESSION_EXPIRED);
      // The local storage should have been cleared by the auth error
      expect(window.localStorage.getItem(KEY_CURRENT_SESSION)).toBeNull();
    });
  });

  describe("onLogin", () => {
    it("calls the registered callback on login", async () => {
      const myCallback = jest.fn();
      const clientAuthentication = mockClientAuthentication();
      clientAuthentication.handleIncomingRedirect = (
        jest.fn() as any
      ).mockResolvedValue({
        isLoggedIn: true,
        sessionId: "a session ID",
        webId: "https://some.webid#them",
      });
      mockLocalStorage({});
      const mySession = new Session({ clientAuthentication });
      mySession.onLogin(myCallback);
      await mySession.handleIncomingRedirect("https://some.url");
      expect(myCallback).toHaveBeenCalled();
    });

    it("does not call the registered callback if login isn't successful", async () => {
      const failCallback = (): void => {
        throw new Error(
          "Should *NOT* call callback - this means test has failed!"
        );
      };
      const clientAuthentication = mockClientAuthentication();
      clientAuthentication.handleIncomingRedirect = jest.fn(
        async (_url: string) => {
          return {
            isLoggedIn: false,
            sessionId: "a session ID",
            webId: "https://some.webid#them",
          };
        }
      );
      const mySession = new Session({ clientAuthentication });
      mySession.onLogin(failCallback);
      await expect(
        mySession.handleIncomingRedirect("https://some.url")
      ).resolves.not.toThrow();
    });

    it("sets the appropriate information before calling the callback", async () => {
      const clientAuthentication = mockClientAuthentication();
      clientAuthentication.handleIncomingRedirect = jest.fn(
        async (_url: string) => {
          return {
            isLoggedIn: true,
            sessionId: "a session ID",
            webId: "https://some.webid#them",
          };
        }
      );
      const mySession = new Session({ clientAuthentication });
      const myCallback = jest.fn((): void => {
        expect(mySession.info.webId).toBe("https://some.webid#them");
      });
      mySession.onLogin(myCallback);
      await mySession.handleIncomingRedirect("https://some.url");
      expect(myCallback).toHaveBeenCalled();
      // Verify that the conditional assertion has been called
      expect.assertions(2);
    });
  });

  describe("onLogout", () => {
    it("calls the registered callback on logout", async () => {
      const myCallback = jest.fn();
      const mySession = new Session({
        clientAuthentication: mockClientAuthentication(),
      });

      mySession.onLogout(myCallback);
      await mySession.logout();
      expect(myCallback).toHaveBeenCalled();
    });
  });

  describe("onSessionRestore", () => {
    it("calls the registered callback on session restore", async () => {
      // Set our window's location to our test value.
      const defaultLocation = "https://coolSite.com/resource";
      const currentLocation = "https://coolSite.com/redirect";

      // This pretends we have previously triggered silent authentication and stored
      // the location.
      mockLocalStorage({
        [KEY_CURRENT_URL]: defaultLocation,
      });
      // This acts as the URL the user has been redirected to.
      mockLocation(currentLocation);
      // This pretends the login is successful.
      const clientAuthentication = mockClientAuthentication();
      clientAuthentication.handleIncomingRedirect = (
        jest.fn() as any
      ).mockResolvedValue({
        isLoggedIn: true,
        sessionId: "a session ID",
        webId: "https://some.webid#them",
      });

      const mySession = new Session({
        clientAuthentication,
      });
      const myCallback = (urlBeforeRestore: string): void => {
        expect(urlBeforeRestore).toEqual(defaultLocation);
      };

      mySession.onSessionRestore(myCallback);
      await mySession.handleIncomingRedirect(currentLocation);

      // This verifies that the callback has been called
      expect.assertions(1);
    });
  });

  describe("onSessionExpiration", () => {
    it("calls the provided callback when receiving the appropriate event", async () => {
      const myCallback = jest.fn();
      const mySession = new Session({
        clientAuthentication: mockClientAuthentication(),
      });
      mySession.onSessionExpiration(myCallback);
      mySession.emit(EVENTS.SESSION_EXPIRED);
      expect(myCallback).toHaveBeenCalled();
    });
  });
});
