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

/**
 * Test for AuthorizationCodeWithPkceOidcHandler
 */
import "reflect-metadata";
import { StorageUtilityMock } from "@inrupt/solid-client-authn-core";
import AuthorizationCodeWithPkceOidcHandler from "./AuthorizationCodeWithPkceOidcHandler";
import canHandleTests from "./OidcHandlerCanHandleTests";
import { SessionInfoManagerMock } from "../../../sessionInfo/__mocks__/SessionInfoManager";
import { standardOidcOptions } from "../__mocks__/IOidcOptions";
import { RedirectorMock } from "../__mocks__/Redirector";

describe("AuthorizationCodeWithPkceOidcHandler", () => {
  const defaultMocks = {
    sessionCreator: SessionInfoManagerMock,
    storageUtility: StorageUtilityMock,
    redirector: RedirectorMock,
  };

  function getAuthorizationCodeWithPkceOidcHandler(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): AuthorizationCodeWithPkceOidcHandler {
    return new AuthorizationCodeWithPkceOidcHandler(
      mocks.storageUtility ?? defaultMocks.storageUtility,
      mocks.redirector ?? defaultMocks.redirector
    );
  }

  describe("canHandle", () => {
    const authorizationCodeWithPkceOidcHandler = getAuthorizationCodeWithPkceOidcHandler();
    canHandleTests.authorizationCodeWithPkceOidcHandler.forEach(
      (testConfig) => {
        // eslint-disable-next-line jest/valid-title
        it(testConfig.message, async () => {
          const value = await authorizationCodeWithPkceOidcHandler.canHandle(
            testConfig.oidcOptions
          );
          expect(value).toBe(testConfig.shouldPass);
        });
      }
    );
  });

  describe("handle", () => {
    it("isn't implemented yet", async () => {
      const authorizationCodeWithPkceOidcHandler = getAuthorizationCodeWithPkceOidcHandler();
      await expect(() =>
        authorizationCodeWithPkceOidcHandler.handle(standardOidcOptions)
      ).rejects.toThrow("Not implemented");
    });
  });
});
