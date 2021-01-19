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

import "reflect-metadata";
import { mockStorageUtility } from "@inrupt/solid-client-authn-core";
import { UuidGeneratorMock } from "../util/__mocks__/UuidGenerator";
import { LogoutHandlerMock } from "../logout/__mocks__/LogoutHandler";
import { SessionInfoManager } from "./SessionInfoManager";
import { REGISTERED_SESSIONS_KEY } from "../constants";

describe("SessionInfoManager", () => {
  const defaultMocks = {
    uuidGenerator: UuidGeneratorMock,
    logoutHandler: LogoutHandlerMock,
    storageUtility: mockStorageUtility({}),
  };

  function getSessionInfoManager(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): SessionInfoManager {
    const sessionManager = new SessionInfoManager(
      mocks.storageUtility ?? defaultMocks.storageUtility
    );
    return sessionManager;
  }

  describe("update", () => {
    it("is not implemented yet", async () => {
      const sessionManager = getSessionInfoManager({
        storageUtility: mockStorageUtility({}),
      });
      await expect(async () =>
        sessionManager.update("commanderCool", {})
      ).rejects.toThrow("Not Implemented");
    });
  });

  describe("get", () => {
    it("retrieves a session from specified storage", async () => {
      const sessionId = "commanderCool";

      const webId = "https://zoomies.com/commanderCool#me";

      const storageMock = mockStorageUtility({
        [`solidClientAuthenticationUser:${sessionId}`]: {
          webId,
          isLoggedIn: "true",
        },
      });

      const sessionManager = getSessionInfoManager({
        storageUtility: storageMock,
      });
      const session = await sessionManager.get(sessionId);
      expect(session).toMatchObject({
        sessionId,
        webId,
        isLoggedIn: true,
      });
    });

    it("returns undefined if the specified storage does not contain the user", async () => {
      const sessionManager = getSessionInfoManager({
        storageUtility: mockStorageUtility({}),
      });
      const session = await sessionManager.get("commanderCool");
      expect(session).toBeUndefined();
    });

    it("retrieves a session internal info from specified storage", async () => {
      const sessionId = "commanderCool";

      const webId = "https://zoomies.com/commanderCool#me";

      const storageMock = mockStorageUtility({
        [`solidClientAuthenticationUser:${sessionId}`]: {
          webId,
          isLoggedIn: "true",
          refreshToken: "some token",
          issuer: "https://my.idp/",
        },
      });

      const sessionManager = getSessionInfoManager({
        storageUtility: storageMock,
      });
      const session = await sessionManager.get(sessionId);
      expect(session).toMatchObject({
        sessionId,
        webId,
        isLoggedIn: true,
        refreshToken: "some token",
        issuer: "https://my.idp/",
      });
    });
  });

  describe("clear", () => {
    it("clears oidc data", async () => {
      const storage = mockStorageUtility({}, true);
      const sessionManager = getSessionInfoManager({
        storageUtility: storage,
      });
      const mockClear = jest.spyOn(storage, "deleteAllUserData");
      await sessionManager.clear("Value of sessionId doesn't matter");
      expect(mockClear).toHaveBeenCalled();
    });

    it("clears local secure storage from user data", async () => {
      const mockStorage = mockStorageUtility(
        {
          mySession: {
            key: "value",
          },
        },
        true
      );
      const sessionManager = getSessionInfoManager({
        storageUtility: mockStorage,
      });
      await sessionManager.clear("mySession");
      expect(
        await mockStorage.getForUser("mySession", "key", { secure: true })
      ).toBeUndefined();
    });

    it("clears local unsecure storage from user data", async () => {
      const mockStorage = mockStorageUtility(
        {
          mySession: {
            key: "value",
          },
        },
        false
      );
      const sessionManager = getSessionInfoManager({
        storageUtility: mockStorage,
      });
      await sessionManager.clear("mySession");
      expect(
        await mockStorage.getForUser("mySession", "key", { secure: false })
      ).toBeUndefined();
    });
  });

  describe("getAll", () => {
    it("is not implemented", async () => {
      const sessionManager = getSessionInfoManager({
        storageUtility: mockStorageUtility({}),
      });
      await expect(sessionManager.getAll).rejects.toThrow("Not implemented");
    });
  });

  describe("register", () => {
    it("adds a new entry in the registered sessions list", async () => {
      const storage = mockStorageUtility({});
      const sessionManager = getSessionInfoManager({
        storageUtility: storage,
      });
      await sessionManager.register("someSession");

      await expect(storage.get(REGISTERED_SESSIONS_KEY)).resolves.toBe(
        JSON.stringify(["someSession"])
      );
    });

    it("does not overwrite registered sessions already in storage", async () => {
      const storage = mockStorageUtility({
        [REGISTERED_SESSIONS_KEY]: JSON.stringify(["some existing session"]),
      });
      const sessionManager = getSessionInfoManager({
        storageUtility: storage,
      });
      await sessionManager.register("some session");

      await expect(storage.get(REGISTERED_SESSIONS_KEY)).resolves.toBe(
        JSON.stringify(["some existing session", "some session"])
      );
    });

    it("does not register an already registered session", async () => {
      const storage = mockStorageUtility({
        [REGISTERED_SESSIONS_KEY]: JSON.stringify(["some session"]),
      });
      const sessionManager = getSessionInfoManager({
        storageUtility: storage,
      });
      await sessionManager.register("some session");

      await expect(storage.get(REGISTERED_SESSIONS_KEY)).resolves.toBe(
        JSON.stringify(["some session"])
      );
    });

    it("does not overwrite registered sessions", async () => {
      const storage = mockStorageUtility({});
      const sessionManager = getSessionInfoManager({
        storageUtility: storage,
      });
      await sessionManager.register("some session");
      await sessionManager.register("some other session");

      await expect(storage.get(REGISTERED_SESSIONS_KEY)).resolves.toBe(
        JSON.stringify(["some session", "some other session"])
      );
    });
  });

  describe("getRegisteredSessionIdAll", () => {
    it("returns a list of all registered session IDs", async () => {
      const sessionManager = getSessionInfoManager({
        storageUtility: mockStorageUtility({}),
      });
      await expect(sessionManager.getRegisteredSessionIdAll()).rejects.toThrow(
        "Unimplemented"
      );
    });

    it("returns an empty list if no session IDs are registered", async () => {
      const sessionManager = getSessionInfoManager({
        storageUtility: mockStorageUtility({}),
      });
      await expect(sessionManager.getRegisteredSessionIdAll()).rejects.toThrow(
        "Unimplemented"
      );
    });
  });

  describe("clearAll", () => {
    it("clears all sessions registrations", async () => {
      const sessionManager = getSessionInfoManager({
        storageUtility: mockStorageUtility({}),
      });
      await expect(sessionManager.clearAll()).rejects.toThrow("Unimplemented");
    });

    it("clears all sessions information", async () => {
      const sessionManager = getSessionInfoManager({
        storageUtility: mockStorageUtility({}),
      });
      await expect(sessionManager.clearAll()).rejects.toThrow("Unimplemented");
    });
  });
});
