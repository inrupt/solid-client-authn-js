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

// The following is required by tsyringe
import "reflect-metadata";
import { it, describe } from "@jest/globals";
import {
  ISessionInfo,
  StorageUtility,
  USER_SESSION_PREFIX,
} from "@inrupt/solid-client-authn-core";
import { mockClientAuthentication } from "../src/__mocks__/ClientAuthentication";
import { Session } from "../src/Session";
import { mockStorage } from "../../core/src/storage/__mocks__/StorageUtility";
import { LocalStorageMock } from "../src/storage/__mocks__/LocalStorage";
import { mockSessionInfoManager } from "../src/sessionInfo/__mocks__/SessionInfoManager";
import { KEY_CURRENT_SESSION, KEY_CURRENT_URL } from "../src/constant";

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
      expect(mySession.info.isLoggedIn).toEqual(false);
      expect(mySession.info.sessionId).toBeDefined();
    });

    it("accepts no config", async () => {
      const mySession = new Session();
      expect(mySession.info.isLoggedIn).toEqual(false);
      expect(mySession.info.sessionId).toBeDefined();
    });

    it("does not generate a session ID if one is provided", () => {
      const mySession = new Session({}, "mySession");
      expect(mySession.info.sessionId).toEqual("mySession");
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
      expect(mySession.info.isLoggedIn).toEqual(false);
      expect(mySession.info.sessionId).toEqual("mySession");
      expect(mySession.info.webId).toEqual("https://some.webid");
    });
  });

  describe("login", () => {
    it("wraps up ClientAuthentication login", async () => {
      const clientAuthentication = mockClientAuthentication();
      const clientAuthnLogin = jest.spyOn(clientAuthentication, "login");
      const mySession = new Session({ clientAuthentication });
      await mySession.login({});
      expect(clientAuthnLogin).toHaveBeenCalled();
    });

    it("preserves a binding to its Session instance", async () => {
      const clientAuthentication = mockClientAuthentication();
      const clientAuthnLogin = jest.spyOn(clientAuthentication, "login");
      const mySession = new Session({ clientAuthentication });
      const objectWithLogin = {
        login: mySession.login,
      };
      await objectWithLogin.login({});
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
      expect(mySession.info.isLoggedIn).toEqual(false);
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
      // @ts-ignore
      expect(window.fetch.mock.instances).toEqual([window]);
    });
  });

  describe("handleincomingRedirect", () => {
    it("uses current window location as default redirect URL", async () => {
      mockLocation("https://some.url");
      const clientAuthentication = mockClientAuthentication();
      const incomingRedirectHandler = jest.spyOn(
        clientAuthentication,
        "handleIncomingRedirect"
      );

      const mySession = new Session({ clientAuthentication });
      await mySession.handleIncomingRedirect();
      expect(incomingRedirectHandler).toHaveBeenCalledWith("https://some.url");
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
      expect(mySession.info.isLoggedIn).toEqual(false);
      await mySession.handleIncomingRedirect("https://some.url");
      expect(mySession.info.isLoggedIn).toEqual(true);
      expect(mySession.info.sessionId).toEqual("a session ID");
      expect(mySession.info.webId).toEqual("https://some.webid#them");
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
      expect(mySession.info.isLoggedIn).toEqual(true);
      await mySession.handleIncomingRedirect("https://some.url");
      // The second request should not hit the wrapped function
      expect(clientAuthentication.handleIncomingRedirect).toHaveBeenCalledTimes(
        1
      );
    });

    it("logs the session out when its tokens expire", async () => {
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
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1337);
      expect(mySession.info.isLoggedIn).toBe(true);

      // Usually, we'd be able to use `jest.runAllTimers()` here. However,
      // logout happens asynchronously. While this is inconsequential in
      // running apps (the timeout complets asynchronously anyway), here, we can
      // take advantage that we return the Promise from the callback in
      // `setTimeout`, so that we can `await` it in this test before checking
      // whether logout was successful:
      const expireTimeout = ((setTimeout as unknown) as jest.Mock<
        typeof setTimeout
      >).mock.calls[0][0];
      await expireTimeout();
      expect(mySession.info.isLoggedIn).toBe(false);
    });

    it("leaves the session's info unchanged if no session is obtained after redirect", async () => {
      const clientAuthentication = mockClientAuthentication();
      clientAuthentication.handleIncomingRedirect = jest.fn(
        async (_url: string) => undefined
      );
      const mySession = new Session({ clientAuthentication }, "mySession");
      await mySession.handleIncomingRedirect("https://some.url");
      expect(mySession.info.isLoggedIn).toEqual(false);
      expect(mySession.info.sessionId).toEqual("mySession");
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
      clientAuthentication.handleIncomingRedirect = jest
        .fn()
        .mockResolvedValue(undefined);
      const mySession = new Session({ clientAuthentication });
      await mySession.handleIncomingRedirect("https://some.redirect/url");
      expect(window.localStorage.getItem(KEY_CURRENT_URL)).toBeNull();
    });

    it("saves current window location if we have stored ID Token", async () => {
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
            idToken: "value doesn't matter",
          },
        })
      );
      const clientAuthentication = mockClientAuthentication({
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });
      clientAuthentication.handleIncomingRedirect = jest
        .fn()
        .mockResolvedValue(undefined);
      clientAuthentication.getCurrentIssuer = jest
        .fn()
        .mockResolvedValue("https://some.issuer/");

      const mySession = new Session({ clientAuthentication });
      await mySession.handleIncomingRedirect("https://some.redirect/url");

      expect(window.localStorage.getItem(KEY_CURRENT_URL)).toEqual(
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
      clientAuthentication.handleIncomingRedirect = jest
        .fn()
        .mockResolvedValue(undefined);
      const mySession = new Session({ clientAuthentication });
      await mySession.handleIncomingRedirect("https://some.redirect/url");
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
        mockStorage({
          [`${USER_SESSION_PREFIX}:${sessionId}`]: {
            idToken: "value doesn't matter",
            redirectUrl: "https://some.redirect/url",
            clientId: "some client ID",
            clientSecret: "some client secret",
          },
        })
      );
      const clientAuthentication = mockClientAuthentication({
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });
      clientAuthentication.getCurrentIssuer = jest
        .fn()
        .mockResolvedValue("https://some.issuer");
      clientAuthentication.handleIncomingRedirect = jest
        .fn()
        .mockResolvedValue(undefined);
      clientAuthentication.login = jest.fn();

      const mySession = new Session({ clientAuthentication });
      await mySession.handleIncomingRedirect("https://some.redirect/url");

      expect(clientAuthentication.login).toHaveBeenCalledWith("mySession", {
        oidcIssuer: "https://some.issuer",
        prompt: "none",
        clientId: "some client ID",
        clientSecret: "some client secret",
        redirectUrl: "https://some.redirect/url",
      });
    });
  });

  describe("onLogin", () => {
    it("calls the registered callback on login", async () => {
      const myCallback = jest.fn();
      const clientAuthentication = mockClientAuthentication();
      clientAuthentication.handleIncomingRedirect = jest
        .fn()
        .mockResolvedValue({
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
    // The `done` callback is used in order to make sure the callback passed to
    // our event handler is called. If it is not, the test times out, which is why
    // no additional assertion is required.
    // eslint-disable-next-line jest/expect-expect, jest/no-done-callback
    it("calls the registered callback on logout", async (done) => {
      const myCallback = (): void => {
        if (done) {
          done();
        }
      };
      const mySession = new Session({
        clientAuthentication: mockClientAuthentication(),
      });

      mySession.onLogout(myCallback);
      await mySession.logout();
    });
  });

  describe("onSessionRestore", () => {
    it("calls the registered callback on session restore", async () => {
      // Set our window's location to our test value.
      const defaultLocation = "https://coolSite.com/resource";
      const currentLocation = "https://coolSite.com/redirect";

      // This pretends we have previously triggerd silent authentication and stored
      // the location.
      mockLocalStorage({
        [KEY_CURRENT_URL]: defaultLocation,
      });
      // This acts as the URL the user has been redirected to.
      mockLocation(currentLocation);
      // This pretends the login is successful
      const clientAuthentication = mockClientAuthentication();
      clientAuthentication.handleIncomingRedirect = jest
        .fn()
        .mockResolvedValue({
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
});
