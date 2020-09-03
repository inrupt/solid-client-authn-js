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

import {
  StorageUtilityMock,
  mockStorageUtility,
} from "../../src/storage/__mocks__/StorageUtility";
import "reflect-metadata";
import { default as LogoutHandler } from "../../src/logout/GeneralLogoutHandler";

describe("OidcLoginHandler", () => {
  const defaultMocks = {
    storageUtility: StorageUtilityMock,
  };
  function getInitialisedHandler(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): LogoutHandler {
    return new LogoutHandler(
      mocks.storageUtility ?? defaultMocks.storageUtility
    );
  }

  describe("canHandle", () => {
    it("should always be able to handle logout", async () => {
      const logoutHandler = getInitialisedHandler({
        storageUtility: mockStorageUtility({}),
      });
      await expect(logoutHandler.canHandle()).resolves.toBe(true);
    });
  });

  describe("handle", () => {
    it("should clear the local storage (both secure and not secure) when logging out", async () => {
      const nonEmptyStorage = mockStorageUtility({
        someUser: { someKey: "someValue" },
      });
      nonEmptyStorage.setForUser(
        "someUser",
        { someKey: "someValue" },
        { secure: true }
      );
      const logoutHandler = getInitialisedHandler({
        storageUtility: nonEmptyStorage,
      });
      logoutHandler.handle("someUser");
      await expect(
        nonEmptyStorage.getForUser("someUser", "someKey", { secure: true })
      ).resolves.toBeUndefined();
      expect(
        nonEmptyStorage.getForUser("someUser", "someKey", { secure: false })
      ).resolves.toBeUndefined();
      // This test is only necessary until the key is stored safely
      expect(
        nonEmptyStorage.get("clientKey", { secure: false })
      ).resolves.toBeUndefined();
    });
  });
});
