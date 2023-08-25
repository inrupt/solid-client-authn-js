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
import { mockStorageUtility } from "@inrupt/solid-client-authn-core";
import { mockLogoutHandler } from "@inrupt/solid-client-authn-core/mocks";
import { UuidGeneratorMock } from "../util/__mocks__/UuidGenerator";
import { SessionInfoManager } from "./SessionInfoManager";
import { KEY_REGISTERED_SESSIONS } from "../constant";

describe("SessionInfoManager", () => {
  const defaultMockStorage = mockStorageUtility({});
  const defaultMocks = {
    uuidGenerator: UuidGeneratorMock,
    logoutHandler: mockLogoutHandler(defaultMockStorage),
    storageUtility: defaultMockStorage,
  };

  function getSessionInfoManager(
    mocks: Partial<typeof defaultMocks> = defaultMocks,
  ): SessionInfoManager {
    const sessionManager = new SessionInfoManager(
      mocks.storageUtility ?? defaultMocks.storageUtility,
    );
    return sessionManager;
  }

  describe("update", () => {
    it("is not implemented yet", async () => {
      const sessionManager = getSessionInfoManager({
        storageUtility: mockStorageUtility({}),
      });
      await expect(async () =>
        sessionManager.update("commanderCool", {}),
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
          issuer: "https://some.idp/",
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
        true,
      );
      const sessionManager = getSessionInfoManager({
        storageUtility: mockStorage,
      });
      await sessionManager.clear("mySession");
      expect(
        await mockStorage.getForUser("mySession", "key", { secure: true }),
      ).toBeUndefined();
    });

    it("clears local unsecure storage from user data", async () => {
      const mockStorage = mockStorageUtility(
        {
          mySession: {
            key: "value",
          },
        },
        false,
      );
      const sessionManager = getSessionInfoManager({
        storageUtility: mockStorage,
      });
      await sessionManager.clear("mySession");
      expect(
        await mockStorage.getForUser("mySession", "key", { secure: false }),
      ).toBeUndefined();
    });

    it("clears the session registration", async () => {
      const storage = mockStorageUtility({
        [KEY_REGISTERED_SESSIONS]: JSON.stringify([
          "a session",
          "another session",
        ]),
      });
      const sessionManager = getSessionInfoManager({
        storageUtility: storage,
      });
      await sessionManager.clear("a session");
      await expect(storage.get(KEY_REGISTERED_SESSIONS)).resolves.toStrictEqual(
        JSON.stringify(["another session"]),
      );
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

      await expect(storage.get(KEY_REGISTERED_SESSIONS)).resolves.toBe(
        JSON.stringify(["someSession"]),
      );
    });

    it("does not overwrite registered sessions already in storage", async () => {
      const storage = mockStorageUtility({
        [KEY_REGISTERED_SESSIONS]: JSON.stringify(["some existing session"]),
      });
      const sessionManager = getSessionInfoManager({
        storageUtility: storage,
      });
      await sessionManager.register("some session");

      await expect(storage.get(KEY_REGISTERED_SESSIONS)).resolves.toBe(
        JSON.stringify(["some existing session", "some session"]),
      );
    });

    it("does not register an already registered session", async () => {
      const storage = mockStorageUtility({
        [KEY_REGISTERED_SESSIONS]: JSON.stringify(["some session"]),
      });
      const sessionManager = getSessionInfoManager({
        storageUtility: storage,
      });
      await sessionManager.register("some session");

      await expect(storage.get(KEY_REGISTERED_SESSIONS)).resolves.toBe(
        JSON.stringify(["some session"]),
      );
    });

    it("does not overwrite registered sessions", async () => {
      const storage = mockStorageUtility({});
      const sessionManager = getSessionInfoManager({
        storageUtility: storage,
      });
      await sessionManager.register("some session");
      await sessionManager.register("some other session");

      await expect(storage.get(KEY_REGISTERED_SESSIONS)).resolves.toBe(
        JSON.stringify(["some session", "some other session"]),
      );
    });
  });

  describe("getRegisteredSessionIdAll", () => {
    it("returns a list of all registered session IDs", async () => {
      const storage = mockStorageUtility({
        [KEY_REGISTERED_SESSIONS]: JSON.stringify([
          "a session",
          "another session",
        ]),
      });
      const sessionManager = getSessionInfoManager({
        storageUtility: storage,
      });

      await expect(
        sessionManager.getRegisteredSessionIdAll(),
      ).resolves.toStrictEqual(["a session", "another session"]);
    });

    it("returns an empty list if no session IDs are registered", async () => {
      const sessionManager = getSessionInfoManager({
        storageUtility: mockStorageUtility({}),
      });
      await expect(
        sessionManager.getRegisteredSessionIdAll(),
      ).resolves.toStrictEqual([]);
    });
  });

  describe("clearAll", () => {
    it("clears all sessions registrations", async () => {
      const storage = mockStorageUtility({
        [KEY_REGISTERED_SESSIONS]: JSON.stringify([
          "a session",
          "another session",
        ]),
      });
      const sessionManager = getSessionInfoManager({
        storageUtility: storage,
      });
      await sessionManager.clearAll();
      await expect(storage.get(KEY_REGISTERED_SESSIONS)).resolves.toStrictEqual(
        JSON.stringify([]),
      );
    });

    it("clears all sessions information", async () => {
      const storage = mockStorageUtility({
        [KEY_REGISTERED_SESSIONS]: JSON.stringify(["a session"]),
        "solidClientAuthenticationUser:a session": {
          "some user info": "a value",
        },
      });
      const sessionManager = getSessionInfoManager({
        storageUtility: storage,
      });
      await sessionManager.clearAll();
      await expect(
        storage.getForUser("a session", "some user info"),
      ).resolves.toBeUndefined();
    });

    it("does not fail if no session information arae available", async () => {
      const storage = mockStorageUtility({});
      const sessionManager = getSessionInfoManager({
        storageUtility: storage,
      });
      await sessionManager.clearAll();
      await expect(
        storage.getForUser("a session", "some user info"),
      ).resolves.toBeUndefined();
    });
  });
});
