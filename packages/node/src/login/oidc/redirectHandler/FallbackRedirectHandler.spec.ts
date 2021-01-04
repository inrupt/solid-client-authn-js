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
import { FallbackRedirectHandler } from "./FallbackRedirectHandler";

jest.mock("cross-fetch");

describe("FallbackRedirectHandler", () => {
  describe("canHandle", () => {
    it("always accept the given IRI", async () => {
      const redirectHandler = new FallbackRedirectHandler();
      expect(
        await redirectHandler.canHandle(
          "https://coolparty.com/?code=someCode&state=oauth2_state_value"
        )
      ).toBe(true);
      expect(await redirectHandler.canHandle("https://coolparty.com/")).toBe(
        true
      );
      expect(
        await redirectHandler.canHandle("https://coolparty.com/?test=test")
      ).toBe(true);
    });

    it("throws on invalid url", async () => {
      const redirectHandler = new FallbackRedirectHandler();
      await expect(
        redirectHandler.canHandle("beep boop I am a robot")
      ).rejects.toThrow(
        "[beep boop I am a robot] is not a valid URL, and cannot be used as a redirect URL"
      );
    });
  });

  describe("handle", () => {
    it("returns an unauthenticated session", async () => {
      const redirectHandler = new FallbackRedirectHandler();
      const mySession = await redirectHandler.handle("https://my.app");
      expect(mySession.isLoggedIn).toEqual(false);
      expect(mySession.webId).toBeUndefined();
    });
  });
});
