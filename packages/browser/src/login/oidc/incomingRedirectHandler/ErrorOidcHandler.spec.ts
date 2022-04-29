/*
 * Copyright 2022 Inrupt Inc.
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

import { jest, it, describe, expect } from "@jest/globals";
import { EventEmitter } from "events";
import { EVENTS } from "@inrupt/solid-client-authn-core";
import { ErrorOidcHandler } from "./ErrorOidcHandler";

describe("ErrorOidcHandler", () => {
  describe("canHandle", () => {
    it("Does not handle IRIs without an error parameter", async () => {
      const redirectHandler = new ErrorOidcHandler();
      expect(
        await redirectHandler.canHandle(
          "https://coolparty.com/?code=someCode&state=oauth2_state_value"
        )
      ).toBe(false);
      expect(await redirectHandler.canHandle("https://coolparty.com/")).toBe(
        false
      );
      expect(
        await redirectHandler.canHandle("https://coolparty.com/?test=test")
      ).toBe(false);
    });

    it("handles url with error params", async () => {
      const redirectHandler = new ErrorOidcHandler();
      expect(
        await redirectHandler.canHandle(
          "https://coolparty.com/?error=some_error"
        )
      ).toBe(true);
    });

    it("throws on invalid url", async () => {
      const redirectHandler = new ErrorOidcHandler();
      await expect(
        redirectHandler.canHandle("beep boop I am a robot")
      ).rejects.toThrow(
        "[beep boop I am a robot] is not a valid URL, and cannot be used as a redirect URL: TypeError: Invalid URL: beep boop I am a robot"
      );
    });
  });

  describe("handle", () => {
    it("returns an unauthenticated session", async () => {
      window.fetch = jest.fn();
      const redirectHandler = new ErrorOidcHandler();
      const mySession = await redirectHandler.handle("https://my.app");
      expect(mySession.isLoggedIn).toBe(false);
      expect(mySession.webId).toBeUndefined();
    });
    it("calls the onError callback if given with both parameters", async () => {
      window.fetch = jest.fn();
      const mockEmitter = new EventEmitter();
      // error events must be handled: https://nodejs.org/dist/latest-v16.x/docs/api/events.html#error-events
      mockEmitter.on(EVENTS.ERROR, jest.fn());
      const mockEmit = jest.spyOn(mockEmitter, "emit");

      const redirectHandler = new ErrorOidcHandler();
      const mySession = await redirectHandler.handle(
        "https://coolparty.com/?error=error&error_description=unable_to_fetch",
        mockEmitter
      );
      expect(mySession.isLoggedIn).toBe(false);
      expect(mySession.webId).toBeUndefined();
      expect(mockEmit).toHaveBeenCalledWith(
        EVENTS.ERROR,
        "error",
        "unable_to_fetch"
      );
    });

    it("calls the onError callback if given with just error parameters if no description is provided", async () => {
      window.fetch = jest.fn();
      const mockEmitter = new EventEmitter();
      const mockEmit = jest.spyOn(mockEmitter, "emit");
      // error events must be handled: https://nodejs.org/dist/latest-v16.x/docs/api/events.html#error-events
      mockEmitter.on(EVENTS.ERROR, jest.fn());

      const redirectHandler = new ErrorOidcHandler();
      const mySession = await redirectHandler.handle(
        "https://coolparty.com/?error=error",
        mockEmitter
      );
      expect(mySession.isLoggedIn).toBe(false);
      expect(mySession.webId).toBeUndefined();
      expect(mockEmit).toHaveBeenCalledWith(EVENTS.ERROR, "error", null);
    });
  });
});
