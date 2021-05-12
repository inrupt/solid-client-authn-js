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

// Required by TSyringe:
import "reflect-metadata";
import {
  ILoginHandler,
  mockStorageUtility,
  LoginResult,
  ILoginOptions,
} from "@inrupt/solid-client-authn-core";
import { LoginHandlerMock } from "./login/__mocks__/LoginHandler";
import {
  RedirectHandlerMock,
  RedirectHandlerResponse,
} from "./login/oidc/redirectHandler/__mocks__/RedirectHandler";
import { LogoutHandlerMock } from "./logout/__mocks__/LogoutHandler";
import { mockSessionInfoManager } from "./sessionInfo/__mocks__/SessionInfoManager";
import ClientAuthentication from "./ClientAuthentication";

jest.mock("cross-fetch");

describe("ClientAuthentication", () => {
  const defaultMocks = {
    loginHandler: LoginHandlerMock,
    redirectHandler: RedirectHandlerMock,
    logoutHandler: LogoutHandlerMock,
    sessionInfoManager: mockSessionInfoManager(mockStorageUtility({})),
  };

  function getClientAuthentication(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): ClientAuthentication {
    return new ClientAuthentication(
      mocks.loginHandler ?? defaultMocks.loginHandler,
      mocks.redirectHandler ?? defaultMocks.redirectHandler,
      mocks.logoutHandler ?? defaultMocks.logoutHandler,
      mocks.sessionInfoManager ?? defaultMocks.sessionInfoManager
    );
  }

  describe("login", () => {
    it("calls login, and defaults to a DPoP token", async () => {
      const clientAuthn = getClientAuthentication();
      await clientAuthn.login("mySession", {
        clientId: "coolApp",
        clientName: "some client app name",
        redirectUrl: "https://coolapp.com/redirect",
        oidcIssuer: "https://idp.com",
      });
      expect(defaultMocks.loginHandler.handle).toHaveBeenCalledWith({
        sessionId: "mySession",
        clientId: "coolApp",
        redirectUrl: "https://coolapp.com/redirect",
        oidcIssuer: "https://idp.com",
        popUp: false,
        clientName: "some client app name",
        clientSecret: undefined,
        handleRedirect: undefined,
        tokenType: "DPoP",
      });
    });

    it("normalizes the redirect IRI", async () => {
      const clientAuthn = getClientAuthentication();
      await clientAuthn.login("mySession", {
        clientId: "coolApp",
        redirectUrl: "https://coolapp.com",
        oidcIssuer: "https://idp.com",
      });
      expect(defaultMocks.loginHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          redirectUrl: "https://coolapp.com/",
        })
      );
    });

    it("may return after login if no redirect is required", async () => {
      const mockedAuthFetch = jest.fn();
      const mockedLoginHandler: jest.Mocked<ILoginHandler> = {
        canHandle: jest.fn((_options: ILoginOptions) => Promise.resolve(true)),
        handle: jest.fn((_options: ILoginOptions) =>
          Promise.resolve({
            fetch: mockedAuthFetch,
            webId: "https://my.webid/",
          } as unknown as LoginResult)
        ),
      };
      const clientAuthn = getClientAuthentication({
        loginHandler: mockedLoginHandler,
      });
      const loginResult = await clientAuthn.login("mySession", {
        refreshToken: "some refresh token",
        clientId: "some client ID",
        clientSecret: "some client secret",
      });
      expect(loginResult).not.toBeUndefined();
      expect(loginResult?.webId).toEqual("https://my.webid/");
      expect(clientAuthn.fetch).toBe(mockedAuthFetch);
    });

    it("request a bearer token if specified", async () => {
      const clientAuthn = getClientAuthentication();
      await clientAuthn.login("mySession", {
        clientId: "coolApp",
        redirectUrl: "https://coolapp.com/redirect",
        oidcIssuer: "https://idp.com",
        tokenType: "Bearer",
      });
      expect(defaultMocks.loginHandler.handle).toHaveBeenCalledWith({
        sessionId: "mySession",
        clientId: "coolApp",
        redirectUrl: "https://coolapp.com/redirect",
        oidcIssuer: "https://idp.com",
        popUp: false,
        clientName: "coolApp",
        clientSecret: undefined,
        handleRedirect: undefined,
        tokenType: "Bearer",
      });
    });
  });

  describe("fetch", () => {
    it("calls fetch", async () => {
      const mockedFetch = jest.requireMock("cross-fetch");
      const clientAuthn = getClientAuthentication();
      await clientAuthn.fetch("https://html5zombo.com");
      expect(mockedFetch).toHaveBeenCalledWith("https://html5zombo.com");
    });
  });

  describe("logout", () => {
    it("reverts back to un-authenticated fetch on logout", async () => {
      const clientAuthn = getClientAuthentication();
      const unauthFetch = clientAuthn.fetch;

      const url =
        "https://coolapp.com/redirect?state=userId&id_token=idToken&access_token=accessToken";
      await clientAuthn.handleIncomingRedirect(url);

      // Calling the redirect handler should give us an authenticated fetch.
      expect(clientAuthn.fetch).not.toBe(unauthFetch);

      await clientAuthn.logout("mySession");

      // Calling logout should revert back to our un-authenticated fetch.
      expect(clientAuthn.fetch).toBe(unauthFetch);
    });
  });

  describe("getSessionInfo", () => {
    it("gets the session info for a specific session ID", async () => {
      const sessionInfo = {
        isLoggedIn: "true",
        sessionId: "mySession",
        webId: "https://pod.com/profile/card#me",
        issuer: "https://some.idp",
      };
      const clientAuthn = getClientAuthentication({
        sessionInfoManager: mockSessionInfoManager(
          mockStorageUtility({
            "solidClientAuthenticationUser:mySession": { ...sessionInfo },
          })
        ),
      });
      const session = await clientAuthn.getSessionInfo("mySession");
      // isLoggedIn is stored as a string under the hood, but deserialized as a boolean
      expect(session).toEqual({ ...sessionInfo, isLoggedIn: true });
    });
  });

  describe("getAllSessionInfo", () => {
    it("gets all session info instances", async () => {
      const clientAuthn = getClientAuthentication();
      await expect(clientAuthn.getAllSessionInfo()).rejects.toThrow(
        "Not implemented"
      );
    });
  });

  describe("getSessionIdAll", () => {
    it("calls the session manager", async () => {
      const sessionInfoManager = mockSessionInfoManager(mockStorageUtility({}));
      const sessionManagerGetAllSpy = jest.spyOn(
        sessionInfoManager,
        "getRegisteredSessionIdAll"
      );
      const clientAuthn = getClientAuthentication({
        sessionInfoManager,
      });
      await clientAuthn.getSessionIdAll();
      expect(sessionManagerGetAllSpy).toHaveBeenCalled();
    });
  });

  describe("registerSession", () => {
    it("calls the session manager", async () => {
      const sessionInfoManager = mockSessionInfoManager(mockStorageUtility({}));
      const sessionManagerRegister = jest.spyOn(sessionInfoManager, "register");
      const clientAuthn = getClientAuthentication({
        sessionInfoManager,
      });
      await clientAuthn.registerSession("some session");
      expect(sessionManagerRegister).toHaveBeenCalled();
    });
  });

  describe("clearSessionAll", () => {
    it("calls the session manager", async () => {
      const sessionInfoManager = mockSessionInfoManager(mockStorageUtility({}));
      const sessionManagerClearAll = jest.spyOn(sessionInfoManager, "clearAll");
      const clientAuthn = getClientAuthentication({
        sessionInfoManager,
      });
      await clientAuthn.clearSessionAll();
      expect(sessionManagerClearAll).toHaveBeenCalled();
    });
  });

  describe("handleIncomingRedirect", () => {
    it("calls handle redirect", async () => {
      const clientAuthn = getClientAuthentication();
      const unauthFetch = clientAuthn.fetch;
      const url =
        "https://coolapp.com/redirect?state=userId&id_token=idToken&access_token=accessToken";
      const redirectInfo = await clientAuthn.handleIncomingRedirect(url);
      expect(redirectInfo).toEqual({
        ...RedirectHandlerResponse,
      });
      expect(defaultMocks.redirectHandler.handle).toHaveBeenCalledWith(
        url,
        undefined
      );

      // Calling the redirect handler should have updated the fetch.
      expect(clientAuthn.fetch).not.toBe(unauthFetch);
    });

    it("calls handle redirect with the refresh token handler if one is provided", async () => {
      const clientAuthn = getClientAuthentication();
      const unauthFetch = clientAuthn.fetch;
      const refreshTokenHandler = jest.fn();
      const url =
        "https://coolapp.com/redirect?state=userId&id_token=idToken&access_token=accessToken";
      const redirectInfo = await clientAuthn.handleIncomingRedirect(
        url,
        refreshTokenHandler
      );
      expect(redirectInfo).toEqual({
        ...RedirectHandlerResponse,
      });
      expect(defaultMocks.redirectHandler.handle).toHaveBeenCalledWith(
        url,
        refreshTokenHandler
      );

      // Calling the redirect handler should have updated the fetch.
      expect(clientAuthn.fetch).not.toBe(unauthFetch);
    });
  });
});
