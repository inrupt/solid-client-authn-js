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

// Required by TSyringe:
import "reflect-metadata";
import { LoginHandlerMock } from "../src/login/__mocks__/LoginHandler";
import {
  RedirectHandlerMock,
  RedirectHandlerResponse,
} from "../src/login/oidc/redirectHandler/__mocks__/RedirectHandler";
import { LogoutHandlerMock } from "../src/logout/__mocks__/LogoutHandler";
import { mockSessionInfoManager } from "../src/sessionInfo/__mocks__/SessionInfoManager";
import {
  AuthenticatedFetcherMock,
  AuthenticatedFetcherResponse,
} from "../src/authenticatedFetch/__mocks__/AuthenticatedFetcher";
import { EnvironmentDetectorMock } from "../src/util/__mocks__/EnvironmentDetector";
import ClientAuthentication from "../src/ClientAuthentication";
import URL from "url-parse";
import { mockStorageUtility } from "@inrupt/solid-client-authn-core";

describe("ClientAuthentication", () => {
  const defaultMocks = {
    loginHandler: LoginHandlerMock,
    redirectHandler: RedirectHandlerMock,
    logoutHandler: LogoutHandlerMock,
    sessionInfoManager: mockSessionInfoManager(mockStorageUtility({})),
    authenticatedFetcher: AuthenticatedFetcherMock,
    environmentDetector: EnvironmentDetectorMock,
  };

  function getClientAuthentication(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): ClientAuthentication {
    return new ClientAuthentication(
      mocks.loginHandler ?? defaultMocks.loginHandler,
      mocks.redirectHandler ?? defaultMocks.redirectHandler,
      mocks.logoutHandler ?? defaultMocks.logoutHandler,
      mocks.sessionInfoManager ?? defaultMocks.sessionInfoManager,
      mocks.authenticatedFetcher ?? defaultMocks.authenticatedFetcher,
      mocks.environmentDetector ?? defaultMocks.environmentDetector
    );
  }

  describe("login", () => {
    it("calls login", async () => {
      const clientAuthn = getClientAuthentication();
      await clientAuthn.login("mySession", {
        clientId: "coolApp",
        redirectUrl: new URL("https://coolapp.com/redirect"),
        oidcIssuer: new URL("https://idp.com"),
      });
      expect(defaultMocks.loginHandler.handle).toHaveBeenCalledWith({
        sessionId: "mySession",
        clientId: "coolApp",
        redirectUrl: new URL("https://coolapp.com/redirect"),
        oidcIssuer: new URL("https://idp.com"),
        popUp: false,
        clientName: "coolApp",
        clientSecret: undefined,
        handleRedirect: undefined,
      });
    });

    it("should clear the local storage when logging in", async () => {
      const nonEmptyStorage = mockStorageUtility({
        someUser: { someKey: "someValue" },
      });
      nonEmptyStorage.setForUser(
        "someUser",
        { someKey: "someValue" },
        { secure: true }
      );
      const clientAuthn = getClientAuthentication({
        sessionInfoManager: mockSessionInfoManager(nonEmptyStorage),
      });
      await clientAuthn.login("someUser", {
        clientId: "coolApp",
        redirectUrl: new URL("https://coolapp.com/redirect"),
        oidcIssuer: new URL("https://idp.com"),
      });
      await expect(
        nonEmptyStorage.getForUser("someUser", "someKey", { secure: true })
      ).resolves.toBeUndefined();
      await expect(
        nonEmptyStorage.getForUser("someUser", "someKey", { secure: false })
      ).resolves.toBeUndefined();
      // This test is only necessary until the key is stored safely
      await expect(
        nonEmptyStorage.get("clientKey", { secure: false })
      ).resolves.toBeUndefined();
    });
  });

  describe("fetch", () => {
    it("calls fetch", async () => {
      const clientAuthn = getClientAuthentication();
      const response = await clientAuthn.fetch(
        "mySession",
        "https://zombo.com"
      );
      expect(response).toBe(AuthenticatedFetcherResponse);
      expect(defaultMocks.authenticatedFetcher.handle).toHaveBeenCalledWith(
        {
          localUserId: "mySession",
          type: "dpop",
        },
        "https://zombo.com",
        undefined
      );
    });
  });

  describe("logout", () => {
    it("calls logout", async () => {
      const clientAuthn = getClientAuthentication();
      await clientAuthn.logout("mySession");
      expect(defaultMocks.logoutHandler.handle).toHaveBeenCalledWith(
        "mySession"
      );
    });
  });

  describe("getSessionInfo", () => {
    it("creates a session for the global user", async () => {
      const sessionInfo = {
        isLoggedIn: "true",
        sessionId: "mySession",
        webId: "https://pod.com/profile/card#me",
      };
      const clientAuthn = getClientAuthentication({
        sessionInfoManager: mockSessionInfoManager(
          mockStorageUtility(
            {
              mySession: { ...sessionInfo },
            },
            true
          )
        ),
      });
      const session = await clientAuthn.getSessionInfo("mySession");
      // isLoggedIn is stored as a string under the hood, but deserialized as a boolean
      expect(session).toEqual({ ...sessionInfo, isLoggedIn: true });
    });
  });

  describe("handleIncomingRedirect", () => {
    it("calls handle redirect", async () => {
      const clientAuthn = getClientAuthentication();
      const url =
        "https://coolapp.com/redirect?state=userId&id_token=idToken&access_token=accessToken";
      const session = await clientAuthn.handleIncomingRedirect(url);
      expect(session).toBe(RedirectHandlerResponse);
      expect(defaultMocks.redirectHandler.handle).toHaveBeenCalledWith(url);
    });
  });
});
