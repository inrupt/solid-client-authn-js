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
import { EventEmitter } from "events";

import type {
  ILoginHandler,
  ILoginOptions,
} from "@inrupt/solid-client-authn-core";
import {
  mockStorageUtility,
  mockIncomingRedirectHandler,
  mockLogoutHandler,
} from "@inrupt/solid-client-authn-core/mocks";
import type * as UniversalFetch from "@inrupt/universal-fetch";
import { Session } from "./Session";

import { mockLoginHandler } from "./login/__mocks__/LoginHandler";
import {
  mockSessionInfoManager,
  SessionCreatorCreateResponse,
} from "./sessionInfo/__mocks__/SessionInfoManager";

import ClientAuthentication from "./ClientAuthentication";

jest.mock("@inrupt/universal-fetch");

describe("ClientAuthentication", () => {
  const defaultMockStorage = mockStorageUtility({});
  const defaultMocks = {
    loginHandler: mockLoginHandler(),
    redirectHandler: mockIncomingRedirectHandler(),
    logoutHandler: mockLogoutHandler(defaultMockStorage),
    sessionInfoManager: mockSessionInfoManager(defaultMockStorage),
  };

  function getClientAuthentication(
    mocks: Partial<typeof defaultMocks> = defaultMocks,
  ): ClientAuthentication {
    return new ClientAuthentication(
      mocks.loginHandler ?? defaultMocks.loginHandler,
      mocks.redirectHandler ?? defaultMocks.redirectHandler,
      mocks.logoutHandler ?? defaultMocks.logoutHandler,
      mocks.sessionInfoManager ?? defaultMocks.sessionInfoManager,
    );
  }

  describe("login", () => {
    const mockEmitter = new EventEmitter();
    it("calls login, and defaults to a DPoP token", async () => {
      const clientAuthn = getClientAuthentication();
      await clientAuthn.login(
        "mySession",
        {
          clientId: "coolApp",
          clientName: "some client app name",
          redirectUrl: "https://coolapp.com/redirect",
          oidcIssuer: "https://idp.com",
        },
        mockEmitter,
      );
      expect(defaultMocks.loginHandler.handle).toHaveBeenCalledWith({
        sessionId: "mySession",
        clientId: "coolApp",
        redirectUrl: "https://coolapp.com/redirect",
        oidcIssuer: "https://idp.com",
        clientName: "some client app name",
        clientSecret: undefined,
        handleRedirect: undefined,
        tokenType: "DPoP",
        eventEmitter: mockEmitter,
        refreshToken: undefined,
      });
    });

    it("throws if the redirect IRI is a malformed URL", async () => {
      const clientAuthn = getClientAuthentication();
      await expect(() =>
        clientAuthn.login(
          "mySession",
          {
            clientId: "coolApp",
            redirectUrl: "not a valid URL",
            oidcIssuer: "https://idp.com",
          },
          mockEmitter,
        ),
      ).rejects.toThrow();
    });

    it("throws if the redirect IRI contains a hash fragment, with a helpful message", async () => {
      const clientAuthn = getClientAuthentication();
      await expect(() =>
        clientAuthn.login(
          "mySession",
          {
            clientId: "coolApp",
            redirectUrl: "https://example.org/redirect#some-fragment",
            oidcIssuer: "https://idp.com",
          },
          mockEmitter,
        ),
      ).rejects.toThrow("hash fragment");
    });

    it("throws if the redirect IRI contains a reserved query parameter, with a helpful message", async () => {
      const clientAuthn = getClientAuthentication();
      await expect(() =>
        clientAuthn.login(
          "mySession",
          {
            tokenType: "DPoP",
            clientId: "coolApp",
            redirectUrl: "https://example.org/redirect?state=1234",
            oidcIssuer: "https://idp.com",
          },
          mockEmitter,
        ),
      ).rejects.toThrow("query parameter");
      await expect(() =>
        clientAuthn.login(
          "mySession",
          {
            tokenType: "DPoP",
            clientId: "coolApp",
            redirectUrl: "https://example.org/redirect?code=1234",
            oidcIssuer: "https://idp.com",
          },
          mockEmitter,
        ),
      ).rejects.toThrow("query parameter");
    });

    it("does not normalize the redirect URL if provided by the user", async () => {
      const clientAuthn = getClientAuthentication();
      await clientAuthn.login(
        "mySession",
        {
          clientId: "coolApp",
          // Note that the redirect IRI does not include a trailing slash.
          redirectUrl: "https://example.org",
          oidcIssuer: "https://idp.com",
        },
        mockEmitter,
      );
      expect(defaultMocks.loginHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          redirectUrl: "https://example.org",
        }),
      );
    });

    it("may return after login if no redirect is required", async () => {
      const mockedAuthFetch = jest.fn();
      const mockedLoginHandler: jest.Mocked<ILoginHandler> = {
        // jest's Mock types don't seem to align here after an update.
        // Not sure what happened; taking the `any` escape since the tests worked.
        canHandle: jest.fn((_options: ILoginOptions) =>
          Promise.resolve(true),
        ) as any,
        handle: jest.fn((_options: ILoginOptions) =>
          Promise.resolve({
            fetch: mockedAuthFetch,
            webId: "https://my.webid/",
          }),
        ) as any,
      };
      const clientAuthn = getClientAuthentication({
        loginHandler: mockedLoginHandler,
      });
      const loginResult = await clientAuthn.login(
        "mySession",
        {
          refreshToken: "some refresh token",
          clientId: "some client ID",
          clientSecret: "some client secret",
        },
        mockEmitter,
      );
      expect(loginResult).toBeDefined();
      expect(loginResult?.webId).toBe("https://my.webid/");
      expect(clientAuthn.fetch).toBe(mockedAuthFetch);
    });

    it("request a bearer token if specified", async () => {
      const clientAuthn = getClientAuthentication();
      await clientAuthn.login(
        "mySession",
        {
          clientId: "coolApp",
          redirectUrl: "https://coolapp.com/redirect",
          oidcIssuer: "https://idp.com",
          tokenType: "Bearer",
        },
        mockEmitter,
      );
      expect(defaultMocks.loginHandler.handle).toHaveBeenCalledWith({
        sessionId: "mySession",
        clientId: "coolApp",
        redirectUrl: "https://coolapp.com/redirect",
        oidcIssuer: "https://idp.com",
        clientName: "coolApp",
        clientSecret: undefined,
        handleRedirect: undefined,
        tokenType: "Bearer",
        eventEmitter: mockEmitter,
      });
    });
  });

  describe("fetch", () => {
    it("calls fetch", async () => {
      const { fetch: mockedFetch } = jest.requireMock(
        "@inrupt/universal-fetch",
      ) as jest.Mocked<typeof UniversalFetch>;
      const clientAuthn = getClientAuthentication();
      await clientAuthn.fetch("https://html5zombo.com");
      expect(mockedFetch).toHaveBeenCalledWith(
        "https://html5zombo.com",
        undefined,
      );
    });
  });

  describe("logout", () => {
    it("reverts back to un-authenticated fetch on logout", async () => {
      const clientAuthn = getClientAuthentication();
      const unauthFetch = clientAuthn.fetch;
      const session = new Session();
      const url =
        "https://coolapp.com/redirect?state=userId&id_token=idToken&access_token=accessToken";
      await clientAuthn.handleIncomingRedirect(url, session);

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
          }),
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
        "Not implemented",
      );
    });
  });

  describe("getSessionIdAll", () => {
    it("calls the session manager", async () => {
      const sessionInfoManager = mockSessionInfoManager(mockStorageUtility({}));
      const sessionManagerGetAllSpy = jest.spyOn(
        sessionInfoManager,
        "getRegisteredSessionIdAll",
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
      const session = new Session();
      const unauthFetch = clientAuthn.fetch;
      const url =
        "https://coolapp.com/redirect?state=userId&id_token=idToken&access_token=accessToken";
      const redirectInfo = await clientAuthn.handleIncomingRedirect(
        url,
        session,
      );
      expect(redirectInfo).toEqual({
        ...SessionCreatorCreateResponse,
      });
      expect(defaultMocks.redirectHandler.handle).toHaveBeenCalledWith(
        url,
        session,
      );

      // Calling the redirect handler should have updated the fetch.
      expect(clientAuthn.fetch).not.toBe(unauthFetch);
    });

    it("calls handle redirect with the refresh token handler if one is provided", async () => {
      const clientAuthn = getClientAuthentication();
      const unauthFetch = clientAuthn.fetch;
      const session = new Session();
      const url =
        "https://coolapp.com/redirect?state=userId&id_token=idToken&access_token=accessToken";
      const redirectInfo = await clientAuthn.handleIncomingRedirect(
        url,
        session,
      );
      expect(redirectInfo).toEqual({
        ...SessionCreatorCreateResponse,
      });
      expect(defaultMocks.redirectHandler.handle).toHaveBeenCalledWith(
        url,
        session,
      );

      // Calling the redirect handler should have updated the fetch.
      expect(clientAuthn.fetch).not.toBe(unauthFetch);
    });
  });
});
