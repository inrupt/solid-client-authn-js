// Required by TSyringe:
import "reflect-metadata";
import {
  LoginHandlerMock,
  LoginHandlerResponse
} from "../src/login/__mocks__/LoginHandler";
import {
  RedirectHandlerMock,
  RedirectHandlerResponse
} from "../src/login/oidc/redirectHandler/__mocks__/RedirectHandler";
import { LogoutHandlerMock } from "../src/logout/__mocks__/LogoutHandler";
import {
  SessionCreatorMock,
  SessionCreatorCreateResponse
} from "../src/solidSession/__mocks__/SessionCreator";
import {
  AuthenticatedFetcherMock,
  AuthenticatedFetcherResponse
} from "../src/authenticatedFetch/__mocks__/AuthenticatedFetcher";
import AuthFetcher from "../src/AuthFetcher";
import URL from "url-parse";

describe("AuthFetcher", () => {
  const defaultMocks = {
    loginHandler: LoginHandlerMock,
    redirectHandler: RedirectHandlerMock,
    logoutHandler: LogoutHandlerMock,
    sessionCreator: SessionCreatorMock,
    authenticatedFetcher: AuthenticatedFetcherMock
  };
  function getAuthFetcher(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): AuthFetcher {
    return new AuthFetcher(
      mocks.loginHandler ?? defaultMocks.loginHandler,
      mocks.redirectHandler ?? defaultMocks.redirectHandler,
      mocks.logoutHandler ?? defaultMocks.logoutHandler,
      mocks.sessionCreator ?? defaultMocks.sessionCreator,
      mocks.authenticatedFetcher ?? defaultMocks.authenticatedFetcher
    );
  }

  describe("login", () => {
    it("calls login", async () => {
      const authFetcher = getAuthFetcher();
      const session = await authFetcher.login({
        clientId: "coolApp",
        redirect: "https://coolapp.com/redirect",
        oidcIssuer: "https://idp.com"
      });
      expect(session).toBe(LoginHandlerResponse);
      expect(defaultMocks.loginHandler.handle).toHaveBeenCalledWith({
        localUserId: "global",
        clientId: "coolApp",
        redirect: new URL("https://coolapp.com/redirect"),
        oidcIssuer: new URL("https://idp.com")
      });
    });
  });

  describe("fetch", () => {
    it("calls fetch", async () => {
      const authFetcher = getAuthFetcher();
      const response = await authFetcher.fetch("https://zombo.com");
      expect(response).toBe(AuthenticatedFetcherResponse);
      expect(defaultMocks.authenticatedFetcher.handle).toHaveBeenCalledWith(
        {
          localUserId: "global",
          type: "dpop"
        },
        "https://zombo.com",
        undefined
      );
    });
  });

  describe("logout", () => {
    it("calls logout", async () => {
      const authFetcher = getAuthFetcher();
      await authFetcher.logout();
      expect(defaultMocks.logoutHandler.handle).toHaveBeenCalledWith("global");
    });
  });

  describe("getSession", () => {
    it("creates a session for the global user", async () => {
      const authFetcher = getAuthFetcher();
      const session = await authFetcher.getSession();
      expect(session).toBe(SessionCreatorCreateResponse);
      expect(defaultMocks.sessionCreator.getSession).toHaveBeenCalledWith(
        "global"
      );
    });
  });

  describe("uniqueLogin", () => {
    it("calls login without a local user", async () => {
      const authFetcher = getAuthFetcher();
      const session = await authFetcher.uniqueLogin({
        clientId: "coolApp",
        redirect: "https://coolapp.com/redirect",
        oidcIssuer: "https://idp.com"
      });
      expect(session).toBe(LoginHandlerResponse);
      expect(defaultMocks.loginHandler.handle).toHaveBeenCalledWith({
        clientId: "coolApp",
        redirect: new URL("https://coolapp.com/redirect"),
        oidcIssuer: new URL("https://idp.com")
      });
    });
  });

  describe("onSession", () => {
    /* Add test once implemented */
  });

  describe("onLogout", () => {
    /* Add test once implemented */
  });

  describe("handleRedirect", () => {
    it("calls handle redirect", async () => {
      const authFetcher = getAuthFetcher();
      const url =
        "https://coolapp.com/redirect?state=userId&id_token=idToken&access_token=accessToken";
      const session = await authFetcher.handleRedirect(url);
      expect(session).toBe(RedirectHandlerResponse);
      expect(defaultMocks.redirectHandler.handle).toHaveBeenCalledWith(url);
    });
  });

  describe("customAuthFetcher", () => {
    /* Add test once implemented */
  });
});
