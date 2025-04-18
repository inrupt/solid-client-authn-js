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
  InMemoryStorage,
  // FIXME: use @inrupt/solid-client-authn-core/mocks instead:
  mockStorage,
  mockStorageUtility,
} from "@inrupt/solid-client-authn-core";
import type { SessionTokenSet } from "core";
import {
  mockClientAuthentication,
  mockCustomClientAuthentication,
} from "./__mocks__/ClientAuthentication";
import { KEY_REGISTERED_SESSIONS } from "./constant";
import {
  clearSessionFromStorageAll,
  getSessionFromStorage,
  getSessionIdFromStorageAll,
  refreshSession,
  refreshTokens,
} from "./multiSession";
import { mockSessionInfoManager } from "./sessionInfo/__mocks__/SessionInfoManager";
import type * as Dependencies from "./dependencies";
import { Session } from "./Session";

jest.mock("./dependencies");

describe("getSessionFromStorage", () => {
  it("returns a logged in Session if a refresh token is available in storage", async () => {
    const clientAuthentication = mockClientAuthentication();
    clientAuthentication.getSessionInfo = jest
      .fn<typeof clientAuthentication.getSessionInfo>()
      .mockResolvedValue({
        webId: "https://my.webid",
        isLoggedIn: true,
        refreshToken: "some token",
        issuer: "https://my.idp",
        sessionId: "mySession",
      });
    clientAuthentication.login = jest
      .fn<typeof clientAuthentication.login>()
      .mockResolvedValue({
        webId: "https://my.webid",
        isLoggedIn: true,
        sessionId: "mySession",
        expirationDate: Date.now() + 3600,
      });
    const dependencies = jest.requireMock("./dependencies") as jest.Mocked<
      typeof Dependencies
    >;
    dependencies.getClientAuthenticationWithDependencies = jest
      .fn<(typeof Dependencies)["getClientAuthenticationWithDependencies"]>()
      .mockReturnValue(clientAuthentication);
    const mySession = await getSessionFromStorage("mySession", mockStorage({}));
    expect(mySession?.info).toStrictEqual(
      expect.objectContaining({
        webId: "https://my.webid",
        isLoggedIn: true,
        sessionId: "mySession",
      }),
    );
    expect(mySession?.info.expirationDate).toBeGreaterThan(Date.now());
  });

  it("returns a logged out Session if the `refreshSession` option is false", async () => {
    const clientAuthentication = mockClientAuthentication();
    clientAuthentication.getSessionInfo = jest
      .fn<typeof clientAuthentication.getSessionInfo>()
      .mockResolvedValue({
        webId: "https://my.webid",
        isLoggedIn: true,
        refreshToken: "some token",
        issuer: "https://my.idp",
        sessionId: "mySession",
      });
    // If we attempt to log the session in, it will succeed, thus failing the test.
    clientAuthentication.login = jest
      .fn<typeof clientAuthentication.login>()
      .mockResolvedValue({
        webId: "https://my.webid",
        isLoggedIn: true,
        sessionId: "mySession",
        expirationDate: Date.now() + 3600,
      });
    const dependencies = jest.requireMock("./dependencies") as jest.Mocked<
      typeof Dependencies
    >;
    dependencies.getClientAuthenticationWithDependencies = jest
      .fn<(typeof Dependencies)["getClientAuthenticationWithDependencies"]>()
      .mockReturnValue(clientAuthentication);
    const mySession = await getSessionFromStorage("mySession", {
      storage: mockStorage({}),
      refreshSession: false,
    });
    expect(mySession?.info).toStrictEqual(
      expect.objectContaining({
        isLoggedIn: false,
      }),
    );
  });

  it("returns a logged out Session if no refresh token is available", async () => {
    const clientAuthentication = mockClientAuthentication();
    clientAuthentication.getSessionInfo = jest
      .fn<typeof clientAuthentication.getSessionInfo>()
      .mockResolvedValueOnce({
        webId: "https://my.webid",
        isLoggedIn: true,
        issuer: "https://my.idp",
        sessionId: "mySession",
        clientAppId: undefined,
      });
    clientAuthentication.logout = jest
      .fn<typeof clientAuthentication.logout>()
      .mockResolvedValueOnce();
    // Mocking the type definitions of the entire DI framework is a bit too
    // involved at this time, so settling for `any`:
    const dependencies = jest.requireMock("./dependencies") as any;
    dependencies.getClientAuthenticationWithDependencies = jest
      .fn()
      .mockReturnValue(clientAuthentication);
    const mySession = await getSessionFromStorage("mySession", mockStorage({}));
    expect(mySession?.info).toStrictEqual({
      isLoggedIn: false,
      sessionId: "mySession",
      webId: "https://my.webid",
      clientAppId: undefined,
    });
  });

  it("returns undefined if no session id matches in storage", async () => {
    const clientAuthentication = mockClientAuthentication();
    clientAuthentication.getSessionInfo = jest
      .fn<typeof clientAuthentication.getSessionInfo>()
      .mockResolvedValueOnce(undefined);
    // Mocking the type definitions of the entire DI framework is a bit too
    // involved at this time, so settling for `any`:
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
      .fn<typeof clientAuthentication.getSessionInfo>()
      .mockResolvedValueOnce(undefined);
    // Mocking the type definitions of the entire DI framework is a bit too
    // involved at this time, so settling for `any`:
    const dependencies = jest.requireMock("./dependencies") as any;
    dependencies.getClientAuthenticationWithDependencies = jest
      .fn()
      .mockReturnValue(clientAuthentication);
    await getSessionFromStorage("mySession");
    const mockDefaultStorage = new InMemoryStorage();
    expect(
      dependencies.getClientAuthenticationWithDependencies,
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
    const dependencies = jest.requireMock("./dependencies") as any;
    dependencies.getClientAuthenticationWithDependencies = jest
      .fn()
      .mockReturnValue(clientAuthentication);
    await getSessionIdFromStorageAll();
    const mockDefaultStorage = new InMemoryStorage();
    expect(
      dependencies.getClientAuthenticationWithDependencies,
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
    const dependencies = jest.requireMock("./dependencies") as any;
    dependencies.getClientAuthenticationWithDependencies = jest
      .fn()
      .mockReturnValue(clientAuthentication);
    await clearSessionFromStorageAll(storage);
    await expect(storage.get(KEY_REGISTERED_SESSIONS)).resolves.toStrictEqual(
      JSON.stringify([]),
    );
  });

  it("falls back to the environment storage if none is specified", async () => {
    const storage = mockStorageUtility({});

    const clientAuthentication = mockCustomClientAuthentication({
      sessionInfoManager: mockSessionInfoManager(storage),
    });
    // Mocking the type definitions of the entire DI framework is a bit too
    // involved at this time, so settling for `any`:
    const dependencies = jest.requireMock("./dependencies") as any;
    dependencies.getClientAuthenticationWithDependencies = jest
      .fn()
      .mockReturnValue(clientAuthentication);
    await clearSessionFromStorageAll();
    const mockDefaultStorage = new InMemoryStorage();
    expect(
      dependencies.getClientAuthenticationWithDependencies,
    ).toHaveBeenCalledWith({
      insecureStorage: mockDefaultStorage,
      secureStorage: mockDefaultStorage,
    });
  });
});

describe("refreshSession", () => {
  it("refreshes a session if it has a stored refresh token", async () => {
    const clientAuthentication = mockClientAuthentication();
    clientAuthentication.getSessionInfo = jest
      .fn<typeof clientAuthentication.getSessionInfo>()
      .mockResolvedValue({
        webId: "https://my.webid",
        isLoggedIn: true,
        refreshToken: "some token",
        issuer: "https://my.idp",
        sessionId: "mySession",
      });
    // If we attempt to log the session in, it will succeed, thus failing the test.
    clientAuthentication.login = jest
      .fn<typeof clientAuthentication.login>()
      .mockResolvedValue({
        webId: "https://my.webid",
        isLoggedIn: true,
        sessionId: "mySession",
        expirationDate: Date.now() + 3600,
      });
    const dependencies = jest.requireMock("./dependencies") as jest.Mocked<
      typeof Dependencies
    >;
    dependencies.getClientAuthenticationWithDependencies = jest
      .fn<(typeof Dependencies)["getClientAuthenticationWithDependencies"]>()
      .mockReturnValue(clientAuthentication);
    const storage = mockStorage({});
    const mySession = await getSessionFromStorage("mySession", {
      storage,
      refreshSession: false,
    });
    // Check that the session is logged out.
    expect(mySession?.info).toStrictEqual(
      expect.objectContaining({
        isLoggedIn: false,
      }),
    );
    await refreshSession(mySession!, { storage });
    // The session should now be logged in.
    expect(mySession?.info).toStrictEqual(
      expect.objectContaining({
        isLoggedIn: true,
      }),
    );
    expect(mySession?.info.expirationDate).toBeGreaterThan(Date.now());
  });
});

describe("refreshTokens", () => {
  it("returns refreshed tokens when refresh is successful", async () => {
    const newTokens = {
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      idToken: "new-id-token",
      clientId: "client-id",
      issuer: "https://my.idp",
      webId: "https://my.webid",
      expiresAt: Date.now() / 1000 + 3600,
    };
    // Mock Session.fromTokens static method
    const mockSession = {
      info: {
        isLoggedIn: true,
        sessionId: "test-session-id",
        webId: "https://my.webid",
      },
      login: jest.fn<Session["login"]>().mockResolvedValue(),
      events: {
        on: jest
          .fn<
            (
              event: "newTokens",
              callback: (tokens: SessionTokenSet) => void,
            ) => void
          >()
          .mockImplementation((_, callback) => {
            // Simulate token refresh by calling the callback with new tokens
            callback(newTokens);
          }),
      },
    };

    // Mock the static method
    const originalFromTokens = Session.fromTokens;
    Session.fromTokens = jest
      .fn<typeof Session.fromTokens>()
      .mockResolvedValue(mockSession as unknown as Session);
    const tokenSet = {
      accessToken: "old-access-token",
      refreshToken: "old-refresh-token",
      clientId: "client-id",
      issuer: "https://my.idp",
    };

    const refreshedTokens = await refreshTokens(tokenSet);

    // Verify we got the refreshed tokens
    expect(refreshedTokens).toEqual(newTokens);
    // Restore the original method
    Session.fromTokens = originalFromTokens;
  });

  it("throws an error when refresh fails", async () => {
    // Mock Session.fromTokens static method with a session that fails to log in
    const mockSession = {
      info: {
        isLoggedIn: false, // Session failed to log in
        sessionId: "test-session-id",
      },
      login: jest.fn<Session["login"]>().mockResolvedValue(),
      events: {
        on: jest.fn(),
      },
    };

    // Mock the static method
    const originalFromTokens = Session.fromTokens;
    Session.fromTokens = jest
      .fn<typeof Session.fromTokens>()
      .mockResolvedValue(mockSession as unknown as Session);

    const tokenSet = {
      accessToken: "old-access-token",
      refreshToken: "old-refresh-token",
      clientId: "client-id",
      issuer: "https://my.idp",
    };

    // The function should reject with an error
    await expect(refreshTokens(tokenSet)).rejects.toThrow(
      "Could not refresh the session.",
    );

    // Restore the original method
    Session.fromTokens = originalFromTokens;
  });
});
