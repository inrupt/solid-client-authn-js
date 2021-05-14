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

/**
 * Test for AuthorizationCodeWithPkceOidcHandler
 */
import "reflect-metadata";
import {
  IOidcOptions,
  IRedirector,
  IRedirectorOptions,
  mockStorage,
  StorageUtility,
  StorageUtilityMock,
} from "@inrupt/solid-client-authn-core";
import AuthorizationCodeWithPkceOidcHandler from "../../../../src/login/oidc/oidcHandlers/AuthorizationCodeWithPkceOidcHandler";
import canHandleTests from "./OidcHandlerCanHandleTests";
import { SessionInfoManagerMock } from "../../../../src/sessionInfo/__mocks__/SessionInfoManager";
import { standardOidcOptions } from "../../../../src/login/oidc/__mocks__/IOidcOptions";
import { RedirectorMock } from "../../../../src/login/oidc/__mocks__/Redirector";

jest.mock("@inrupt/oidc-client-ext");

const expectedSigninRedirectUrl = "https://test";

const mockOidcModule = (
  url: string = expectedSigninRedirectUrl,
  state = "test state"
) => {
  const oidcModule = jest.requireMock("@inrupt/oidc-client-ext");
  oidcModule.OidcClient = jest.fn().mockReturnValue({
    createSigninRequest: jest.fn().mockResolvedValue({
      url,
      state,
    }),
  });
  return oidcModule;
};

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
    const authorizationCodeWithPkceOidcHandler =
      getAuthorizationCodeWithPkceOidcHandler();
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
    it("swallows any redirector exceptions", async () => {
      mockOidcModule();
      const redirectorThatThrowsMock: jest.Mocked<IRedirector> = {
        redirect: jest.fn(
          (redirectUrl: string, redirectOptions: IRedirectorOptions) => {
            throw new Error(
              `Redirecting to [${redirectUrl}] with options [${redirectOptions}] throws...`
            );
          }
        ),
      };

      const authorizationCodeWithPkceOidcHandler =
        getAuthorizationCodeWithPkceOidcHandler({
          redirector: redirectorThatThrowsMock,
        });

      const oidcOptions: IOidcOptions = {
        ...standardOidcOptions,
        // Set this to test this code path too (doesn't warrant a whole test!).
        dpop: false,
        issuerConfiguration: {
          ...standardOidcOptions.issuerConfiguration,
          grantTypesSupported: ["authorization_code"],
        },
      };
      await authorizationCodeWithPkceOidcHandler.handle(oidcOptions);
      expect(redirectorThatThrowsMock.redirect).toHaveBeenCalledTimes(1);
    });

    it("handles login properly with PKCE", async () => {
      mockOidcModule();
      const authorizationCodeWithPkceOidcHandler =
        getAuthorizationCodeWithPkceOidcHandler();
      const oidcOptions: IOidcOptions = {
        ...standardOidcOptions,
        issuerConfiguration: {
          ...standardOidcOptions.issuerConfiguration,
          grantTypesSupported: ["authorization_code"],
        },
      };
      await authorizationCodeWithPkceOidcHandler.handle(oidcOptions);
      expect(defaultMocks.redirector.redirect).toHaveBeenCalledWith(
        expectedSigninRedirectUrl,
        {
          handleRedirect: standardOidcOptions.handleRedirect,
        }
      );
    });

    it("stores code verifier and redirect URL", async () => {
      mockOidcModule();
      const mockedStorage = new StorageUtility(
        mockStorage({}),
        mockStorage({})
      );
      const authorizationCodeWithPkceOidcHandler =
        getAuthorizationCodeWithPkceOidcHandler({
          storageUtility: mockedStorage,
        });
      const oidcOptions: IOidcOptions = {
        ...standardOidcOptions,
        redirectUrl: "https://app.example.com?someQuery=someValue",
        issuerConfiguration: {
          ...standardOidcOptions.issuerConfiguration,
          grantTypesSupported: ["authorization_code"],
        },
      };
      await authorizationCodeWithPkceOidcHandler.handle(oidcOptions);
      await expect(
        mockedStorage.getForUser("mySession", "redirectUrl", {
          secure: false,
        })
      ).resolves.toStrictEqual("https://app.example.com?someQuery=someValue");
      await expect(
        mockedStorage.getForUser("mySession", "codeVerifier", {
          secure: false,
        })
      ).resolves.not.toBeNull();
    });

    it("passes our the 'prompt' option down to our OIDC client library implementation", async () => {
      const oidcModule = mockOidcModule();
      const authorizationCodeWithPkceOidcHandler =
        getAuthorizationCodeWithPkceOidcHandler();
      const oidcOptions: IOidcOptions = {
        prompt: "none",
        ...standardOidcOptions,
        issuerConfiguration: {
          ...standardOidcOptions.issuerConfiguration,
          grantTypesSupported: ["authorization_code"],
        },
      };
      await authorizationCodeWithPkceOidcHandler.handle(oidcOptions);
      expect(oidcModule.OidcClient).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: "none",
        })
      );
    });

    it("handles login when a client secret is present", async () => {
      mockOidcModule();
      const authorizationCodeWithPkceOidcHandler =
        getAuthorizationCodeWithPkceOidcHandler();
      const oidcOptions: IOidcOptions = {
        ...standardOidcOptions,
        client: {
          ...standardOidcOptions.client,
          clientSecret: "I can't cook because I only drink Soylent",
        },
        issuerConfiguration: {
          ...standardOidcOptions.issuerConfiguration,
          grantTypesSupported: ["authorization_code"],
        },
      };
      await authorizationCodeWithPkceOidcHandler.handle(oidcOptions);
      expect(defaultMocks.redirector.redirect).toHaveBeenCalledWith(
        expectedSigninRedirectUrl,
        {
          handleRedirect: standardOidcOptions.handleRedirect,
        }
      );
    });
  });
});
