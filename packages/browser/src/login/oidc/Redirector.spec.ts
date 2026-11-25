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

import {
  jest,
  it,
  describe,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import Redirector from "./Redirector";

/**
 * Test for Redirector
 */
declare const __setTestUrl: (url: string) => void;

describe("Redirector", () => {
  describe("redirect", () => {
    beforeEach(() => {
      __setTestUrl("https://coolSite.com");
      jest.spyOn(window.history, "replaceState").mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("browser redirection defaults to using href", () => {
      const redirector = new Redirector();
      redirector.redirect("https://someUrl.com/redirect");
      expect(window.history.replaceState).not.toHaveBeenCalled();
    });

    it("browser redirection uses replaceState if specified", () => {
      const redirector = new Redirector();
      redirector.redirect("https://someUrl.com/redirect", {
        redirectByReplacingState: true,
      });
      expect(window.history.replaceState).toHaveBeenCalledWith(
        {},
        "",
        "https://someUrl.com/redirect",
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
