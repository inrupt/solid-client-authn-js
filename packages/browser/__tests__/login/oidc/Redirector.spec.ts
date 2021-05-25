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

import "reflect-metadata";
import { jest, it, describe, expect } from "@jest/globals";
import Redirector from "../../../src/login/oidc/Redirector";

jest.mock("../../../src/iframe");

/**
 * Test for Redirector
 */
describe("Redirector", () => {
  describe("redirect", () => {
    const {
      location,
      history: { replaceState },
    } = window;

    beforeEach(() => {
      // location and history aren't optional on window, which makes TS complain
      // (rightfully) when we delete them. However, they are deleted on purpose
      // here just for testing.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      delete window.location;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      delete window.history.replaceState;
      window.location = {
        href: "https://coolSite.com",
      } as Location;
      window.history.replaceState = jest.fn();
    });

    afterEach(() => {
      window.location = location;
      window.history.replaceState = replaceState;
    });

    it("browser redirection defaults to using href", () => {
      const redirector = new Redirector();
      redirector.redirect("https://someUrl.com/redirect");
      expect(window.history.replaceState).not.toHaveBeenCalled();
      expect(window.location.href).toBe("https://someUrl.com/redirect");
    });

    it("browser redirection uses replaceState if specified", () => {
      const redirector = new Redirector();
      redirector.redirect("https://someUrl.com/redirect", {
        redirectByReplacingState: true,
      });
      expect(window.history.replaceState).toHaveBeenCalledWith(
        {},
        "",
        "https://someUrl.com/redirect"
      );
      expect(window.location.href).toBe("https://coolSite.com");
    });

    it("redirects in an iframe if specified", () => {
      const iframe = jest.requireMock("../../../src/iframe");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const redirectInIframe = jest.spyOn(iframe as any, "redirectInIframe");
      const redirector = new Redirector();
      redirector.redirect("https://someUrl.com/redirect", {
        redirectInIframe: true,
      });
      expect(redirectInIframe).toHaveBeenCalledWith(
        "https://someUrl.com/redirect"
      );
    });

    it("calls redirect handler", () => {
      const handler = jest.fn();
      const redirectUrl = "https://someUrl.com/redirect";
      const redirector = new Redirector();
      redirector.redirect(redirectUrl, {
        redirectByReplacingState: true,
        handleRedirect: handler,
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(redirectUrl);
    });
  });
});
