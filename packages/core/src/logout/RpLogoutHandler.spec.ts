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

import { describe, expect, it, jest } from "@jest/globals";
import LogoutHandler from "./RpLogoutHandler";
import { maybeBuildRpInitiatedLogout } from "./endSessionUrl";

describe("RpLogoutHandler", () => {
  const defaultMocks = {
    redirect: jest.fn(),
  };
  function getInitialisedHandler(mocks = defaultMocks): LogoutHandler {
    return new LogoutHandler(mocks);
  }

  describe("canHandle", () => {
    it("should only be able to handle idp logout; whether or not handleRedirect is supplied", async () => {
      const logoutHandler = getInitialisedHandler();
      await expect(
        logoutHandler.canHandle("session", { logoutType: "idp" }),
      ).resolves.toBe(true);
      await expect(
        logoutHandler.canHandle("session", { logoutType: "app" }),
      ).resolves.toBe(false);
      await expect(logoutHandler.canHandle("session")).resolves.toBe(false);
      await expect(
        logoutHandler.canHandle("session", {
          logoutType: "idp",
          handleRedirect: () => {
            /* noop */
          },
        }),
      ).resolves.toBe(true);
    });
  });

  describe("handle", () => {
    it("rejects if no options are supplied", async () => {
      const logoutHandler = getInitialisedHandler();

      await expect(logoutHandler.handle("session")).rejects.toThrow();
    });

    it("rejects if logout type is app", async () => {
      const logoutHandler = getInitialisedHandler();

      await expect(
        logoutHandler.handle("session", { logoutType: "app" }),
      ).rejects.toThrow();
    });

    it("rejects if logout type is app even if toLogoutUrl is supplied", async () => {
      const logoutHandler = getInitialisedHandler();

      await expect(
        logoutHandler.handle("session", {
          logoutType: "app",
          toLogoutUrl: () => "myFixedString",
        }),
      ).rejects.toThrow();
    });

    it("rejects if logout type is idp but no toLogoutUrl is provided", async () => {
      const logoutHandler = getInitialisedHandler();

      await expect(
        logoutHandler.handle("session", { logoutType: "idp" }),
      ).rejects.toThrow();
    });

    it("rejects if logout type is idp but toLogoutUrl is undefined", async () => {
      const logoutHandler = getInitialisedHandler();

      await expect(
        logoutHandler.handle("session", {
          logoutType: "idp",
          toLogoutUrl: undefined,
        }),
      ).rejects.toThrow();
    });

    it("calls redirect handler on value returned by toLogoutUrl", async () => {
      const fn = jest.fn();
      const logoutHandler = getInitialisedHandler({ redirect: fn });

      await expect(
        logoutHandler.handle("session", {
          logoutType: "idp",
          toLogoutUrl: () => "myFixedString",
        }),
      ).resolves.toBeUndefined();
      expect(fn).toHaveBeenCalledWith("myFixedString", {
        handleRedirect: undefined,
      });
    });

    it("calls redirect handler on value returned by toLogoutUrl which is called with postLogoutUrl", async () => {
      const fn = jest.fn();
      const logoutHandler = getInitialisedHandler({ redirect: fn });

      await expect(
        logoutHandler.handle("session", {
          logoutType: "idp",
          toLogoutUrl: (p) => `${p.postLogoutUrl}-myFixedString`,
          postLogoutUrl: "prefix",
        }),
      ).resolves.toBeUndefined();
      expect(fn).toHaveBeenCalledWith("prefix-myFixedString", {
        handleRedirect: undefined,
      });
    });

    it("calls redirect handler on value returned by toLogoutUrl which is called with postLogoutUrl and state", async () => {
      const fn = jest.fn();
      const logoutHandler = getInitialisedHandler({ redirect: fn });

      await expect(
        logoutHandler.handle("session", {
          state: "s",
          logoutType: "idp",
          toLogoutUrl: (p) => `${p.postLogoutUrl}-${p.state}-myFixedString`,
          postLogoutUrl: "prefix",
        }),
      ).resolves.toBeUndefined();
      expect(fn).toHaveBeenCalledWith("prefix-s-myFixedString", {
        handleRedirect: undefined,
      });
    });

    it("calls redirect handler with expected logout url build by maybeBuildRpInitiatedLogout", async () => {
      const fn = jest.fn();
      const logoutHandler = getInitialisedHandler({ redirect: fn });
      const toLogoutUrl = maybeBuildRpInitiatedLogout({
        endSessionEndpoint: "https://example.com/logout",
        idTokenHint: "idTokenHint",
      });

      await expect(
        logoutHandler.handle("session", {
          state: "s",
          logoutType: "idp",
          toLogoutUrl,
          postLogoutUrl: "https://example.org/app/logout/url",
        }),
      ).resolves.toBeUndefined();
      expect(fn).toHaveBeenCalledWith(
        "https://example.com/logout?id_token_hint=idTokenHint&post_logout_redirect_uri=https%3A%2F%2Fexample.org%2Fapp%2Flogout%2Furl&state=s",
        {
          handleRedirect: undefined,
        },
      );
    });

    it("redirect url should not include state if no postLogoutUrl is provided", async () => {
      const fn = jest.fn();
      const logoutHandler = getInitialisedHandler({ redirect: fn });
      const toLogoutUrl = maybeBuildRpInitiatedLogout({
        endSessionEndpoint: "https://example.com/logout",
        idTokenHint: "idTokenHint",
      });

      await expect(
        logoutHandler.handle("session", {
          logoutType: "idp",
          toLogoutUrl,
          state: "s",
        }),
      ).resolves.toBeUndefined();
      expect(fn).toHaveBeenCalledWith(
        "https://example.com/logout?id_token_hint=idTokenHint",
        {
          handleRedirect: undefined,
        },
      );
    });
  });
});
