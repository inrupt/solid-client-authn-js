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

import "reflect-metadata";
import Redirector from "../../../src/login/oidc/Redirector";

/**
 * Test for Redirector
 */
describe("Redirector", () => {
  describe("Redirect", () => {
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
  });
});
