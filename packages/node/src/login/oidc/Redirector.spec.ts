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
import Redirector from "./Redirector";

/**
 * Test for Redirector
 */
describe("Redirector", () => {
  describe("Redirect", () => {
    it("calls the provided redirect callback", () => {
      const redirector = new Redirector();
      const redirectCallback = jest.fn();
      redirector.redirect("https://someUrl.com/redirect", {
        handleRedirect: redirectCallback,
      });
      expect(redirectCallback).toHaveBeenCalled();
    });

    it("throws if no handler is provided", () => {
      const redirector = new Redirector();
      expect(() =>
        redirector.redirect("https://someUrl.com/redirect"),
      ).toThrow();
    });
  });
});
