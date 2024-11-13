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
import type { ISessionInfo } from "@inrupt/solid-client-authn-core";
import { EVENTS } from "@inrupt/solid-client-authn-core";
import { mockStorage } from "@inrupt/solid-client-authn-core/mocks";
import type EventEmitter from "events";
import { mockClientAuthentication } from "./__mocks__/ClientAuthentication";
import type ClientAuthentication from "./ClientAuthentication";
import { Session } from "./Session";

jest.mock("./dependencies");

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

    it("accepts legacy input storage", async () => {
      // Mocking the type definitions of the entire DI framework is a bit too
      // involved at this time, so settling for `any`:
      const dependencies = jest.requireMock("./dependencies") as any;
      dependencies.getClientAuthenticationWithDependencies = jest.fn();
      const insecureStorage = mockStorage({});
      const secureStorage = mockStorage({});

      const mySession = new Session({
        insecureStorage,
        secureStorage,
      });
      expect(mySession).toBeDefined();
      expect(
        dependencies.getClientAuthenticationWithDependencies,
      ).toHaveBeenCalledWith({
        secureStorage,
        insecureStorage,
      });
    });

    it("accepts input storage", async () => {
      // Mocking the type definitions of the entire DI framework is a bit too
      // involved at this time, so settling for `any`:
      const dependencies = jest.requireMock("./dependencies") as any;
      dependencies.getClientAuthenticationWithDependencies = jest.fn();
      const storage = mockStorage({});
      const mySession = new Session({
        storage,
      });
      expect(mySession).toBeDefined();
      expect(
        dependencies.getClientAuthenticationWithDependencies,
      ).toHaveBeenCalledWith({
        secureStorage: storage,
        insecureStorage: storage,
      });
    });

    it("ignores legacy input storage if new input storage is specified", async () => {
      // Mocking the type definitions of the entire DI framework is a bit too
      // involved at this time, so settling for `any`:
      const dependencies = jest.requireMock("./dependencies") as any;
      dependencies.getClientAuthenticationWithDependencies = jest.fn();
      const insecureStorage = mockStorage({});
      const secureStorage = mockStorage({});
      const storage = mockStorage({});
      const mySession = new Session({
        insecureStorage,
        secureStorage,
        storage,
      });
      expect(mySession).toBeDefined();
      expect(
        dependencies.getClientAuthenticationWithDependencies,
      ).toHaveBeenCalledWith({
        secureStorage: storage,
        insecureStorage: storage,
      });
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

    it("listens on the timeout event", () => {
      const mySession = new Session();
      (mySession.events as EventEmitter).emit(EVENTS.TIMEOUT_SET, 0);
      expect(
        (mySession as unknown as { lastTimeoutHandle: number })
          .lastTimeoutHandle,
      ).toBe(0);
    });

    it("logs the session out on error", async () => {
      const mySession = new Session({
        clientAuthentication: mockClientAuthentication(),
      });
      // Spy on the private session logout
      const spiedLogout = jest.spyOn(
        mySession as unknown as { internalLogout: () => Promise<void> },
        "internalLogout",
      );
      const logoutEventcallback = jest.fn();
      mySession.events.on(EVENTS.LOGOUT, logoutEventcallback);
      (mySession.events as EventEmitter).emit(EVENTS.ERROR);
      // The internal logout should have been called...
      expect(spiedLogout).toHaveBeenCalled();
      // ... but the user-initiated logout signal should not have been sent
      expect(logoutEventcallback).not.toHaveBeenCalled();
    });

    it("logs the session out on expiration", async () => {
      const mySession = new Session({
        clientAuthentication: mockClientAuthentication(),
      });
      const logoutEventcallback = jest.fn();
      mySession.events.on(EVENTS.LOGOUT, logoutEventcallback);
      (mySession.events as EventEmitter).emit(EVENTS.SESSION_EXPIRED);
      // The internal logout should have been called...
      expect(mySession.info.isLoggedIn).toBe(false);
      // ... but the user-initiated logout signal should not have been sent
      expect(logoutEventcallback).not.toHaveBeenCalled();
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

    it("updates the session info with the login return value", async () => {
      const clientAuthentication = mockClientAuthentication();
      clientAuthentication.login = jest
        .fn<typeof clientAuthentication.login>()
        .mockResolvedValueOnce({
          isLoggedIn: true,
          sessionId: "mySession",
          webId: "https://my.webid/",
        });
      const mySession = new Session({ clientAuthentication });
      await mySession.login({});
      expect(mySession.info.isLoggedIn).toBe(true);
      expect(mySession.info.sessionId).toBe("mySession");
      expect(mySession.info.webId).toBe("https://my.webid/");
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

    it("clears the timeouts", async () => {
      const mySession = new Session({
        clientAuthentication: mockClientAuthentication(),
      });
      (
        mySession as unknown as { lastTimeoutHandle: number }
      ).lastTimeoutHandle = 12345;
      const spiedClearTimeout = jest.spyOn(global, "clearTimeout");
      await mySession.logout();
      expect(spiedClearTimeout).toHaveBeenCalledWith(12345);
    });
  });

  describe("fetch", () => {
    it("wraps up ClientAuthentication fetch if logged in", async () => {
      const clientAuthentication = mockClientAuthentication();
      clientAuthentication.login = jest
        .fn<typeof clientAuthentication.login>()
        .mockResolvedValueOnce({
          isLoggedIn: true,
          sessionId: "mySession",
        });
      clientAuthentication.fetch = jest
        .fn<typeof fetch>()
        .mockResolvedValueOnce({} as any);
      const mySession = new Session({ clientAuthentication });
      await mySession.login({});
      await mySession.fetch("https://some.url");
      expect(clientAuthentication.fetch).toHaveBeenCalled();
    });

    it("defaults to non-authenticated fetch if not logged in", async () => {
      const clientAuthentication = mockClientAuthentication();
      jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response());
      const mySession = new Session({ clientAuthentication });
      await mySession.fetch("https://some.url");
      expect(fetch).toHaveBeenCalled();
    });
  });

  describe("handleincomingRedirect", () => {
    it("wraps up ClientAuthentication handleIncomingRedirect", async () => {
      const clientAuthentication = mockClientAuthentication();
      const clientAuthnHandle = jest.spyOn(
        clientAuthentication,
        "handleIncomingRedirect",
      );
      const mySession = new Session({ clientAuthentication });
      await mySession.handleIncomingRedirect("https://some.url");
      expect(clientAuthnHandle).toHaveBeenCalled();
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
        },
      );
      const mySession = new Session({ clientAuthentication });
      expect(mySession.info.isLoggedIn).toBe(false);
      await mySession.handleIncomingRedirect("https://some.url");
      expect(mySession.info.isLoggedIn).toBe(true);
      expect(mySession.info.sessionId).toBe("a session ID");
      expect(mySession.info.webId).toBe("https://some.webid#them");
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
        },
      );
      const mySession = new Session({ clientAuthentication });
      await mySession.handleIncomingRedirect("https://some.url");
      expect(mySession.info.isLoggedIn).toBe(true);
      await mySession.handleIncomingRedirect("https://some.url");
      // The second request should not hit the wrapped function
      expect(clientAuthentication.handleIncomingRedirect).toHaveBeenCalledTimes(
        1,
      );
    });

    it("leaves the session's info unchanged if no session is obtained after redirect", async () => {
      const clientAuthentication = mockClientAuthentication();
      clientAuthentication.handleIncomingRedirect = jest.fn(
        async (_url: string) => undefined,
      );
      const mySession = new Session({ clientAuthentication }, "mySession");
      await mySession.handleIncomingRedirect("https://some.url");
      expect(mySession.info.isLoggedIn).toBe(false);
      expect(mySession.info.sessionId).toBe("mySession");
    });

    function sleep(ms: number): Promise<void> {
      return new Promise((resolve) => {
        setTimeout(resolve, ms);
      });
    }

    it("prevents from hitting the token endpoint twice with the same auth code", async () => {
      const clientAuthentication = mockClientAuthentication();
      const obtainedSession: ISessionInfo = {
        isLoggedIn: true,
        sessionId: "mySession",
      };
      let secondRequestIssued = false;
      const blockingRequest = async (): Promise<ISessionInfo> => {
        while (!secondRequestIssued) {
          // eslint-disable-next-line no-await-in-loop
          await sleep(100);
        }
        return obtainedSession;
      };
      // The ClientAuthn's handleIncomingRedirect will only return when the
      // second Session's handleIncomingRedirect has been called.
      clientAuthentication.handleIncomingRedirect = jest.fn(
        async (_url: string) => blockingRequest(),
      );
      const mySession = new Session({ clientAuthentication });
      const firstTokenRequest = mySession.handleIncomingRedirect(
        "https://my.app/?code=someCode&state=arizona",
      );
      const secondTokenRequest = mySession.handleIncomingRedirect(
        "https://my.app/?code=someCode&state=arizona",
      );
      secondRequestIssued = true;
      const tokenRequests = await Promise.all([
        firstTokenRequest,
        secondTokenRequest,
      ]);
      // One of the two token requests should not have reached the token endpoint
      // because the other was pending.
      expect(tokenRequests).toContain(undefined);
    });
  });

  describe("events.on", () => {
    describe("login", () => {
      it("calls the registered callback on login", async () => {
        const myCallback = jest.fn();
        const clientAuthentication = mockClientAuthentication();
        clientAuthentication.handleIncomingRedirect = jest
          .fn<ClientAuthentication["handleIncomingRedirect"]>()
          .mockResolvedValue({
            isLoggedIn: true,
            sessionId: "a session ID",
            webId: "https://some.webid#them",
          });
        const mySession = new Session({ clientAuthentication });
        mySession.events.on(EVENTS.LOGIN, myCallback);
        await mySession.handleIncomingRedirect("https://some.url");
        expect(myCallback).toHaveBeenCalled();
      });

      it("does not call the registered callback if login isn't successful", async () => {
        const myCallback = jest.fn();
        const clientAuthentication = mockClientAuthentication();
        clientAuthentication.handleIncomingRedirect = jest
          .fn<ClientAuthentication["handleIncomingRedirect"]>()
          .mockResolvedValue({
            isLoggedIn: true,
            sessionId: "a session ID",
            webId: "https://some.webid#them",
          });
        const mySession = new Session({ clientAuthentication });
        mySession.events.on(EVENTS.LOGIN, myCallback);
        expect(myCallback).not.toHaveBeenCalled();
      });

      it("sets the appropriate information before calling the callback", async () => {
        const clientAuthentication = mockClientAuthentication();
        clientAuthentication.handleIncomingRedirect = jest
          .fn<ClientAuthentication["handleIncomingRedirect"]>()
          .mockResolvedValue({
            isLoggedIn: true,
            sessionId: "a session ID",
            webId: "https://some.webid#them",
          });
        const mySession = new Session({ clientAuthentication });
        const myCallback = jest.fn((): void => {
          expect(mySession.info.webId).toBe("https://some.webid#them");
        });
        mySession.events.on(EVENTS.LOGIN, myCallback);
        await mySession.handleIncomingRedirect("https://some.url");
        expect(myCallback).toHaveBeenCalled();
        // Verify that the conditional assertion has been called
        expect.assertions(2);
      });
    });

    describe("logout", () => {
      it("calls the registered callback on logout", async () => {
        const myCallback = jest.fn();
        const mySession = new Session({
          clientAuthentication: mockClientAuthentication(),
        });

        mySession.events.on(EVENTS.LOGOUT, myCallback);
        await mySession.logout();
        expect(myCallback).toHaveBeenCalled();
      });
    });

    describe("sessionExpired", () => {
      it("calls the provided callback when receiving the appropriate event", async () => {
        const myCallback = jest.fn();
        const mySession = new Session({
          clientAuthentication: mockClientAuthentication(),
        });
        mySession.events.on(EVENTS.SESSION_EXPIRED, myCallback);
        (mySession.events as EventEmitter).emit(EVENTS.SESSION_EXPIRED);
        expect(myCallback).toHaveBeenCalled();
      });
    });

    describe("newRefreshToken", () => {
      it("calls the registered callback on the newRefreshToken event", async () => {
        const myCallback = jest.fn();
        const mySession = new Session();
        mySession.events.on(EVENTS.NEW_REFRESH_TOKEN, myCallback);
        (mySession.events as EventEmitter).emit(
          "newRefreshToken",
          "some new refresh token",
        );
        expect(myCallback).toHaveBeenCalledWith("some new refresh token");
      });
    });
  });
});
