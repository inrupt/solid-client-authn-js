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
import { mockStorageUtility } from "@inrupt/solid-client-authn-core";
import { UuidGeneratorMock } from "../util/__mocks__/UuidGenerator";
import { LogoutHandlerMock } from "../logout/__mocks__/LogoutHandler";
import { SessionInfoManager } from "./SessionInfoManager";

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

      const storageMock = mockStorageUtility(
        {
          [`solidClientAuthenticationUser:${sessionId}`]: {
            webId,
            isLoggedIn: "true",
          },
        },
        true
      );

      // const storageUtility = defaultMocks.storageUtility;
      // storageUtility.getForUser
      //   .mockReturnValueOnce(
      //     Promise.resolve("https://zoomies.com/commanderCool#me")
      //   )
      //   .mockReturnValueOnce(Promise.resolve("true"));

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
        storageUtility: mockStorageUtility({}, true),
      });
      const session = await sessionManager.get("commanderCool");
      expect(session).toBeUndefined();
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
});
