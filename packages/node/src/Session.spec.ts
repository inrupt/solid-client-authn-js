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
  InMemoryStorage,
  ISessionInfo,
  mockStorageUtility,
} from "@inrupt/solid-client-authn-core";
import {
  mockClientAuthentication,
  mockCustomClientAuthentication,
} from "./__mocks__/ClientAuthentication";
import { Session } from "./Session";
import { mockStorage } from "../../core/src/storage/__mocks__/StorageUtility";
import { mockSessionInfoManager } from "./sessionInfo/__mocks__/SessionInfoManager";
import { KEY_REGISTERED_SESSIONS } from "./constant";
import {
  clearSessionFromStorageAll,
  getSessionFromStorage,
  getSessionIdFromStorageAll,
} from "./multiSession";

jest.mock("cross-fetch");
jest.mock("./dependencies");

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

    it("accepts legacy input storage", async () => {
      // Mocking the type definitions of the entire DI framework is a bit too
      // involved at this time, so settling for `any`:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dependencies = jest.requireMock("./dependencies") as any;
      dependencies.getClientAuthenticationWithDependencies = jest.fn();
      const insecureStorage = mockStorage({});
      const secureStorage = mockStorage({});

      const mySession = new Session({
        insecureStorage,
        secureStorage,
      });
      expect(mySession).not.toBeUndefined();
      expect(
        dependencies.getClientAuthenticationWithDependencies
      ).toHaveBeenCalledWith({
        secureStorage,
        insecureStorage,
      });
    });

    it("accepts input storage", async () => {
      // Mocking the type definitions of the entire DI framework is a bit too
      // involved at this time, so settling for `any`:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dependencies = jest.requireMock("./dependencies") as any;
      dependencies.getClientAuthenticationWithDependencies = jest.fn();
      const storage = mockStorage({});
      const mySession = new Session({
        storage,
      });
      expect(mySession).not.toBeUndefined();
      expect(
        dependencies.getClientAuthenticationWithDependencies
      ).toHaveBeenCalledWith({
        secureStorage: storage,
        insecureStorage: storage,
      });
    });

    it("ignores legacy input storage if new input storage is specified", async () => {
      // Mocking the type definitions of the entire DI framework is a bit too
      // involved at this time, so settling for `any`:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      expect(mySession).not.toBeUndefined();
      expect(
        dependencies.getClientAuthenticationWithDependencies
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

    it("updates the session info with the login return value", async () => {
      const clientAuthentication = mockClientAuthentication();
      clientAuthentication.login = jest
        .fn<
          ReturnType<typeof clientAuthentication.login>,
          Parameters<typeof clientAuthentication.login>
        >()
        .mockResolvedValueOnce({
          isLoggedIn: true,
          sessionId: "mySession",
          webId: "https://my.webid/",
        });
      const mySession = new Session({ clientAuthentication });
      await mySession.login({});
      expect(mySession.info.isLoggedIn).toEqual(true);
      expect(mySession.info.sessionId).toEqual("mySession");
      expect(mySession.info.webId).toEqual("https://my.webid/");
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
  });

  describe("fetch", () => {
    it("wraps up ClientAuthentication fetch if logged in", async () => {
      const clientAuthentication = mockClientAuthentication();
      clientAuthentication.login = jest
        .fn<
          ReturnType<typeof clientAuthentication.login>,
          Parameters<typeof clientAuthentication.login>
        >()
        .mockResolvedValueOnce({
          isLoggedIn: true,
          sessionId: "mySession",
        });
      clientAuthentication.fetch = jest
        .fn<
          ReturnType<typeof clientAuthentication.fetch>,
          Parameters<typeof clientAuthentication.fetch>
        >()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .mockResolvedValueOnce({} as any);
      const mySession = new Session({ clientAuthentication });
      await mySession.login({});
      await mySession.fetch("https://some.url");
      expect(clientAuthentication.fetch).toHaveBeenCalled();
    });

    it("defaults to non-authenticated fetch if not logged in", async () => {
      const clientAuthentication = mockClientAuthentication();
      const mockedFetch = jest.requireMock("cross-fetch");
      const mySession = new Session({ clientAuthentication });
      await mySession.fetch("https://some.url");
      expect(mockedFetch).toHaveBeenCalled();
    });
  });

  describe("handleincomingRedirect", () => {
    it("wraps up ClientAuthentication handleIncomingRedirect", async () => {
      const clientAuthentication = mockClientAuthentication();
      const clientAuthnHandle = jest.spyOn(
        clientAuthentication,
        "handleIncomingRedirect"
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

    function sleep(ms: number): Promise<void> {
      return new Promise((resolve) => setTimeout(resolve, ms));
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
        async (_url: string) => blockingRequest()
      );
      const mySession = new Session({ clientAuthentication });
      const firstTokenRequest = mySession.handleIncomingRedirect(
        "https://my.app/?code=someCode&state=arizona"
      );
      const secondTokenRequest = mySession.handleIncomingRedirect(
        "https://my.app/?code=someCode&state=arizona"
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

  describe("onLogin", () => {
    it("calls the registered callback on login", async () => {
      const myCallback = jest.fn();
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
    // onLogin is called. If it is not, the test times out, which is why
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
});

describe("getSessionFromStorage", () => {
  it("returns a logged in Session if a refresh token is available in storage", async () => {
    const clientAuthentication = mockClientAuthentication();
    clientAuthentication.getSessionInfo = jest
      .fn<
        ReturnType<typeof clientAuthentication.getSessionInfo>,
        Parameters<typeof clientAuthentication.getSessionInfo>
      >()
      .mockResolvedValueOnce({
        webId: "https://my.webid",
        isLoggedIn: true,
        refreshToken: "some token",
        issuer: "https://my.idp",
        sessionId: "mySession",
      });
    clientAuthentication.login = jest
      .fn<
        ReturnType<typeof clientAuthentication.login>,
        Parameters<typeof clientAuthentication.login>
      >()
      .mockResolvedValueOnce({
        webId: "https://my.webid",
        isLoggedIn: true,
        sessionId: "mySession",
      });
    // Mocking the type definitions of the entire DI framework is a bit too
    // involved at this time, so settling for `any`:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dependencies = jest.requireMock("./dependencies") as any;
    dependencies.getClientAuthenticationWithDependencies = jest
      .fn()
      .mockReturnValue(clientAuthentication);
    const mySession = await getSessionFromStorage("mySession", mockStorage({}));
    expect(mySession?.info).toStrictEqual({
      webId: "https://my.webid",
      isLoggedIn: true,
      sessionId: "mySession",
    });
  });

  it("returns a logged out Session if no refresh token is available", async () => {
    const clientAuthentication = mockClientAuthentication();
    clientAuthentication.getSessionInfo = jest
      .fn<
        ReturnType<typeof clientAuthentication.getSessionInfo>,
        Parameters<typeof clientAuthentication.getSessionInfo>
      >()
      .mockResolvedValueOnce({
        webId: "https://my.webid",
        isLoggedIn: true,
        issuer: "https://my.idp",
        sessionId: "mySession",
      });
    clientAuthentication.logout = jest
      .fn<
        ReturnType<typeof clientAuthentication.logout>,
        Parameters<typeof clientAuthentication.logout>
      >()
      .mockResolvedValueOnce();
    // Mocking the type definitions of the entire DI framework is a bit too
    // involved at this time, so settling for `any`:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dependencies = jest.requireMock("./dependencies") as any;
    dependencies.getClientAuthenticationWithDependencies = jest
      .fn()
      .mockReturnValue(clientAuthentication);
    const mySession = await getSessionFromStorage("mySession", mockStorage({}));
    expect(mySession?.info).toStrictEqual({
      isLoggedIn: false,
      sessionId: "mySession",
      webId: "https://my.webid",
    });
  });

  it("returns undefined if no session id matches in storage", async () => {
    const clientAuthentication = mockClientAuthentication();
    clientAuthentication.getSessionInfo = jest
      .fn<
        ReturnType<typeof clientAuthentication.getSessionInfo>,
        Parameters<typeof clientAuthentication.getSessionInfo>
      >()
      .mockResolvedValueOnce(undefined);
    // Mocking the type definitions of the entire DI framework is a bit too
    // involved at this time, so settling for `any`:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dependencies = jest.requireMock("./dependencies") as any;
    dependencies.getClientAuthenticationWithDependencies = jest
      .fn()
      .mockReturnValue(clientAuthentication);
    const mySession = await getSessionFromStorage("mySession", mockStorage({}));
    expect(mySession?.info).toBeUndefined();
  });

  it("falls back to the environment storage if none is specified", async () => {
    const clientAuthentication = mockClientAuthentication();
    clientAuthentication.getSessionInfo = jest
      .fn<
        ReturnType<typeof clientAuthentication.getSessionInfo>,
        Parameters<typeof clientAuthentication.getSessionInfo>
      >()
      .mockResolvedValueOnce(undefined);
    // Mocking the type definitions of the entire DI framework is a bit too
    // involved at this time, so settling for `any`:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dependencies = jest.requireMock("./dependencies") as any;
    dependencies.getClientAuthenticationWithDependencies = jest
      .fn()
      .mockReturnValue(clientAuthentication);
    await getSessionFromStorage("mySession");
    const mockDefaultStorage = new InMemoryStorage();
    expect(
      dependencies.getClientAuthenticationWithDependencies
    ).toHaveBeenCalledWith({
      insecureStorage: mockDefaultStorage,
      secureStorage: mockDefaultStorage,
    });
  });
});

describe("getStoredSessionIdAll", () => {
  it("returns all the session IDs available in storage", async () => {
    const storage = mockStorageUtility({
      [KEY_REGISTERED_SESSIONS]: JSON.stringify([
        "a session",
        "another session",
      ]),
    });

    const clientAuthentication = mockCustomClientAuthentication({
      sessionInfoManager: mockSessionInfoManager(storage),
    });
    // Mocking the type definitions of the entire DI framework is a bit too
    // involved at this time, so settling for `any`:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dependencies = jest.requireMock("./dependencies") as any;
    dependencies.getClientAuthenticationWithDependencies = jest
      .fn()
      .mockReturnValue(clientAuthentication);
    const sessions = await getSessionIdFromStorageAll(mockStorage({}));
    expect(sessions).toStrictEqual(["a session", "another session"]);
  });

  it("falls back to the environment storage if none is specified", async () => {
    const storage = mockStorageUtility({
      [KEY_REGISTERED_SESSIONS]: JSON.stringify([
        "a session",
        "another session",
      ]),
    });

    const clientAuthentication = mockCustomClientAuthentication({
      sessionInfoManager: mockSessionInfoManager(storage),
    });
    // Mocking the type definitions of the entire DI framework is a bit too
    // involved at this time, so settling for `any`:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dependencies = jest.requireMock("./dependencies") as any;
    dependencies.getClientAuthenticationWithDependencies = jest
      .fn()
      .mockReturnValue(clientAuthentication);
    await getSessionIdFromStorageAll();
    const mockDefaultStorage = new InMemoryStorage();
    expect(
      dependencies.getClientAuthenticationWithDependencies
    ).toHaveBeenCalledWith({
      insecureStorage: mockDefaultStorage,
      secureStorage: mockDefaultStorage,
    });
  });
});

describe("clearSessionAll", () => {
  it("clears all the sessions in storage", async () => {
    const storage = mockStorageUtility({
      [KEY_REGISTERED_SESSIONS]: JSON.stringify([
        "a session",
        "another session",
      ]),
    });

    const clientAuthentication = mockCustomClientAuthentication({
      sessionInfoManager: mockSessionInfoManager(storage),
    });
    // Mocking the type definitions of the entire DI framework is a bit too
    // involved at this time, so settling for `any`:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dependencies = jest.requireMock("./dependencies") as any;
    dependencies.getClientAuthenticationWithDependencies = jest
      .fn()
      .mockReturnValue(clientAuthentication);
    await clearSessionFromStorageAll(storage);
    await expect(storage.get(KEY_REGISTERED_SESSIONS)).resolves.toStrictEqual(
      JSON.stringify([])
    );
  });

  it("falls back to the environment storage if none is specified", async () => {
    const storage = mockStorageUtility({});

    const clientAuthentication = mockCustomClientAuthentication({
      sessionInfoManager: mockSessionInfoManager(storage),
    });
    // Mocking the type definitions of the entire DI framework is a bit too
    // involved at this time, so settling for `any`:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dependencies = jest.requireMock("./dependencies") as any;
    dependencies.getClientAuthenticationWithDependencies = jest
      .fn()
      .mockReturnValue(clientAuthentication);
    await clearSessionFromStorageAll();
    const mockDefaultStorage = new InMemoryStorage();
    expect(
      dependencies.getClientAuthenticationWithDependencies
    ).toHaveBeenCalledWith({
      insecureStorage: mockDefaultStorage,
      secureStorage: mockDefaultStorage,
    });
  });
});
