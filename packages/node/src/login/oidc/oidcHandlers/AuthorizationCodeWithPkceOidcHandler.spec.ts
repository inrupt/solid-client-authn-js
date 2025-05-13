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

/**
 * Test for AuthorizationCodeWithPkceOidcHandler
 */
import { jest, it, describe, expect } from "@jest/globals";
import {
  mockStorageUtility,
  StorageUtilityMock,
  EVENTS,
  type AuthorizationRequestState,
} from "@inrupt/solid-client-authn-core";
// eslint-disable-next-line no-shadow
import { URL } from "url";
import EventEmitter from "events";
import AuthorizationCodeWithPkceOidcHandler from "./AuthorizationCodeWithPkceOidcHandler";
import canHandleTests from "./OidcHandlerCanHandleTests";
import { SessionInfoManagerMock } from "../../../sessionInfo/__mocks__/SessionInfoManager";
import {
  mockDefaultOidcOptions,
  mockOidcOptions,
} from "../__mocks__/IOidcOptions";
import { mockRedirector, mockedRedirector } from "../__mocks__/Redirector";

describe("AuthorizationCodeWithPkceOidcHandler", () => {
  const defaultMocks = {
    sessionCreator: SessionInfoManagerMock,
    storageUtility: StorageUtilityMock,
    redirector: mockRedirector(),
  };

  function getAuthorizationCodeWithPkceOidcHandler(
    mocks: Partial<typeof defaultMocks> = defaultMocks,
  ): AuthorizationCodeWithPkceOidcHandler {
    return new AuthorizationCodeWithPkceOidcHandler(
      mocks.storageUtility ?? defaultMocks.storageUtility,
      mocks.redirector ?? defaultMocks.redirector,
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
            testConfig.oidcOptions,
          );
          expect(value).toBe(testConfig.shouldPass);
        });
      },
    );
  });

  describe("handle", () => {
    it("redirects the user to the specified IdP", async () => {
      const authorizationCodeWithPkceOidcHandler =
        getAuthorizationCodeWithPkceOidcHandler();

      await authorizationCodeWithPkceOidcHandler.handle(
        mockDefaultOidcOptions(),
      );

      const builtUrl = new URL(mockedRedirector.mock.calls[0][0]);
      expect(builtUrl.hostname).toEqual(
        new URL(mockDefaultOidcOptions().issuer).hostname,
      );
    });

    it("sets the specified options in the query params", async () => {
      const authorizationCodeWithPkceOidcHandler =
        getAuthorizationCodeWithPkceOidcHandler();
      const oidcOptions = mockDefaultOidcOptions();

      await authorizationCodeWithPkceOidcHandler.handle(oidcOptions);

      const builtUrl = new URL(mockedRedirector.mock.calls[0][0]);
      expect(builtUrl.searchParams.get("client_id")).toEqual(
        oidcOptions.client.clientId,
      );
      expect(builtUrl.searchParams.get("response_type")).toBe("code");
      expect(builtUrl.searchParams.get("redirect_uri")).toEqual(
        oidcOptions.redirectUrl,
      );
      expect(builtUrl.searchParams.get("code_challenge")).not.toBeNull();
      expect(builtUrl.searchParams.get("prompt")).toBe("consent");
      expect(builtUrl.searchParams.get("scope")).toBe(
        "openid offline_access webid",
      );
    });

    it("saves relevant information in storage", async () => {
      const mockedStorage = mockStorageUtility({});
      const authorizationCodeWithPkceOidcHandler =
        getAuthorizationCodeWithPkceOidcHandler({
          storageUtility: mockedStorage,
        });
      const oidcOptions = mockDefaultOidcOptions();

      await authorizationCodeWithPkceOidcHandler.handle(oidcOptions);

      await expect(
        mockedStorage.getForUser(oidcOptions.sessionId, "codeVerifier"),
      ).resolves.not.toBeNull();
      await expect(
        mockedStorage.getForUser(oidcOptions.sessionId, "issuer"),
      ).resolves.toEqual(oidcOptions.issuer);
      await expect(
        mockedStorage.getForUser(oidcOptions.sessionId, "redirectUrl"),
      ).resolves.toEqual(oidcOptions.redirectUrl);
      await expect(
        mockedStorage.getForUser(oidcOptions.sessionId, "dpop"),
      ).resolves.toBe("true");
    });

    it("serializes the token type boolean appropriately", async () => {
      const mockedStorage = mockStorageUtility({});
      const authorizationCodeWithPkceOidcHandler =
        getAuthorizationCodeWithPkceOidcHandler({
          storageUtility: mockedStorage,
        });
      const oidcOptions = mockOidcOptions({
        dpop: false,
      });

      await authorizationCodeWithPkceOidcHandler.handle(oidcOptions);

      await expect(
        mockedStorage.getForUser(oidcOptions.sessionId, "dpop"),
      ).resolves.toBe("false");
    });

    it("emits AUTHORIZATION_REQUEST event with codeVerifier and state when eventEmitter is provided", async () => {
      const mockedStorage = mockStorageUtility({});
      const eventEmitter = new EventEmitter();
      const authStateSpy =
        jest.fn<(params: AuthorizationRequestState) => void>();
      eventEmitter.on(EVENTS.AUTHORIZATION_REQUEST, authStateSpy);

      const authorizationCodeWithPkceOidcHandler =
        getAuthorizationCodeWithPkceOidcHandler({
          storageUtility: mockedStorage,
        });
      const oidcOptions = mockDefaultOidcOptions();
      oidcOptions.eventEmitter = eventEmitter;

      await authorizationCodeWithPkceOidcHandler.handle(oidcOptions);

      expect(authStateSpy).toHaveBeenCalledTimes(1);
      expect(authStateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          codeVerifier: expect.any(String),
          state: expect.any(String),
          issuer: oidcOptions.issuer,
          redirectUrl: oidcOptions.redirectUrl,
          dpopBound: oidcOptions.dpop,
          clientId: oidcOptions.client.clientId,
        }),
      );

      const authStateArg = authStateSpy.mock.calls[0][0];

      // The state isn't stored with the key "state" - it's used as the key itself
      // to store the sessionId. We need to verify the state exists as a key in storage.
      const sessionIdFromState = await mockedStorage.getForUser(
        authStateArg.state,
        "sessionId",
      );
      expect(sessionIdFromState).toBe(oidcOptions.sessionId);

      // Verify the same codeVerifier is saved in storage and emitted in event
      const codeVerifierFromStorage = await mockedStorage.getForUser(
        oidcOptions.sessionId,
        "codeVerifier",
      );
      expect(authStateArg.codeVerifier).toBe(codeVerifierFromStorage);

      // Verify the same issuer is saved in storage and emitted in event
      const issuerFromStorage = await mockedStorage.getForUser(
        oidcOptions.sessionId,
        "issuer",
      );
      expect(authStateArg.issuer).toBe(issuerFromStorage);

      // Verify the same redirectUrl is saved in storage and emitted in event
      const redirectUrlFromStorage = await mockedStorage.getForUser(
        oidcOptions.sessionId,
        "redirectUrl",
      );
      expect(authStateArg.redirectUrl).toBe(redirectUrlFromStorage);

      // Verify the same dpopBound value is saved in storage and emitted in event
      const dpopFromStorage = await mockedStorage.getForUser(
        oidcOptions.sessionId,
        "dpop",
      );
      expect(authStateArg.dpopBound.toString()).toBe(dpopFromStorage);

      // Cannot verify the clientId as it is only saved in storage bu the ClientRegistrar
    });

    it("does not emit AUTHORIZATION_REQUEST event when eventEmitter is not provided", async () => {
      const eventEmitter = new EventEmitter();
      const authStateSpy = jest.fn();
      eventEmitter.on(EVENTS.AUTHORIZATION_REQUEST, authStateSpy);

      const authorizationCodeWithPkceOidcHandler =
        getAuthorizationCodeWithPkceOidcHandler();

      const oidcOptions = mockDefaultOidcOptions();
      // Deliberately not setting eventEmitter

      await authorizationCodeWithPkceOidcHandler.handle(oidcOptions);

      expect(authStateSpy).not.toHaveBeenCalled();
    });
  });
});
