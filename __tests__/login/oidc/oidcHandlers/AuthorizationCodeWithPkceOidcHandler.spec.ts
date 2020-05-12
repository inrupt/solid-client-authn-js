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

/**
 * Test for AuthorizationCodeWithPkceOidcHandler
 */
import "reflect-metadata";
import AuthorizationCodeWithPkceOidcHandler from "../../../../src/login/oidc/oidcHandlers/AuthorizationCodeWithPkceOidcHandler";
import { JoseUtilityMock } from "../../../../src/jose/__mocks__/JoseUtility";
import { StorageUtilityMock } from "../../../../src/localStorage/__mocks__/StorageUtility";
import canHandleTests from "./OidcHandlerCanHandleTests";
import { SessionCreatorMock } from "../../../../src/solidSession/__mocks__/SessionCreator";
import ISolidSession from "../../../../src/solidSession/ISolidSession";
import IOidcOptions from "../../../../src/login/oidc/IOidcOptions";
import { standardOidcOptions } from "../../../../src/login/oidc/__mocks__/IOidcOptions";
import {
  RedirectorMock,
  RedirectorResponse
} from "../../../../src/login/oidc/__mocks__/Redirector";

describe("AuthorizationCodeWithPkceOidcHandler", () => {
  const defaultMocks = {
    sessionCreator: SessionCreatorMock,
    joseUtility: JoseUtilityMock,
    storageUtility: StorageUtilityMock,
    redirector: RedirectorMock
  };
  function getAuthorizationCodeWithPkceOidcHandler(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): AuthorizationCodeWithPkceOidcHandler {
    return new AuthorizationCodeWithPkceOidcHandler(
      mocks.sessionCreator ?? defaultMocks.sessionCreator,
      mocks.joseUtility ?? defaultMocks.joseUtility,
      mocks.storageUtility ?? defaultMocks.storageUtility,
      mocks.redirector ?? defaultMocks.redirector
    );
  }

  describe("canHandle", () => {
    const authorizationCodeWithPkceOidcHandler = getAuthorizationCodeWithPkceOidcHandler();
    canHandleTests["authorizationCodeWithPkceOidcHandler"].forEach(
      testConfig => {
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
    it("Handles login properly with PKCE", async () => {
      const authorizationCodeWithPkceOidcHandler = getAuthorizationCodeWithPkceOidcHandler();
      const oidcOptions: IOidcOptions = {
        ...standardOidcOptions,
        issuerConfiguration: {
          ...standardOidcOptions.issuerConfiguration,
          grantTypesSupported: ["authorization_code"]
        }
      };
      const session: ISolidSession = await authorizationCodeWithPkceOidcHandler.handle(
        oidcOptions
      );
      expect(
        defaultMocks.redirector.redirect
      ).toHaveBeenCalledWith(
        "https://example.com/auth?response_type=id_token%20code&redirect_uri=https%3A%2F%2Fapp.example.com&scope=openid%20profile&client_id=coolApp&code_challenge_method=S256&code_challenge=codeChallenge&state=global",
        { doNotAutoRedirect: false }
      );
      expect(session.neededAction).toMatchObject(RedirectorResponse);
    });
  });
});
