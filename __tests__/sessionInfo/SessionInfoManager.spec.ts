/**
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
import { UuidGeneratorMock } from "../../src/util/__mocks__/UuidGenerator";
import { AuthenticatedFetcherMock } from "../../src/authenticatedFetch/__mocks__/AuthenticatedFetcher";
import { LogoutHandlerMock } from "../../src/logout/__mocks__/LogoutHandler";
import { EmptyStorageUtilityMock } from "../../src/storage/__mocks__/StorageUtility";
import SessionInfoManager from "../../src/sessionInfo/SessionInfoManager";

describe("SessionInfoManager", () => {
  const defaultMocks = {
    uuidGenerator: UuidGeneratorMock,
    authenticatedFetcher: AuthenticatedFetcherMock,
    logoutHandler: LogoutHandlerMock,
    storageUtility: EmptyStorageUtilityMock
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
        storageUtility: EmptyStorageUtilityMock
      });
      expect(
        async () => await sessionManager.update("commanderCool", {})
      ).rejects.toThrow("Not Implemented");
    });
  });

  describe("get", () => {
    it("retrieves a session from specified storage", async () => {
      const storageUtility = defaultMocks.storageUtility;
      storageUtility.getForUser
        .mockReturnValueOnce(
          Promise.resolve("https://zoomies.com/commanderCool#me")
        )
        .mockReturnValueOnce(Promise.resolve("true"));
      const sessionManager = getSessionInfoManager({ storageUtility });
      const session = await sessionManager.get("commanderCool");
      expect(session).toMatchObject({
        sessionId: "commanderCool",
        webId: "https://zoomies.com/commanderCool#me"
      });
    });

    it("returns undefined if the specified storage does not contain the user", async () => {
      const sessionManager = getSessionInfoManager({
        storageUtility: EmptyStorageUtilityMock
      });
      const session = await sessionManager.get("commanderCool");
      expect(session).toBeUndefined();
    });
  });
});
