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

import { InMemoryStorage } from "@inrupt/solid-client-authn-core";
import { jest, it, describe, expect } from "@jest/globals";
import {
  mockClientAuthentication,
  mockCustomClientAuthentication,
} from "./__mocks__/ClientAuthentication";
import {
  mockStorage,
  mockStorageUtility,
} from "../../core/src/storage/__mocks__/StorageUtility";
import { KEY_REGISTERED_SESSIONS } from "./constant";
import {
  clearSessionFromStorageAll,
  getSessionFromStorage,
  getSessionIdFromStorageAll,
} from "./multiSession";
import { mockSessionInfoManager } from "./sessionInfo/__mocks__/SessionInfoManager";

jest.mock("./dependencies");

describe("getSessionFromStorage", () => {
  it("returns a logged in Session if a refresh token is available in storage", async () => {
    const clientAuthentication = mockClientAuthentication();
    clientAuthentication.getSessionInfo = jest
      .fn<
        ReturnType<typeof clientAuthentication.getSessionInfo>,
        Parameters<typeof clientAuthentication.getSessionInfo>
      >()
      .mockResolvedValue({
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
      .mockResolvedValue({
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
