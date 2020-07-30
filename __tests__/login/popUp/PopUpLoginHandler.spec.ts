/**
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

// Required by TSyringe:
import "reflect-metadata";
import PopUpLoginHandler from "../../../src/login/popUp/PopUpLoginHandler";
import { EnvironmentDetectorMock } from "../../../src/util/__mocks__/EnvironmentDetector";
import {
  SessionInfoManagerMock,
  SessionCreatorCreateResponse
} from "../../../src/sessionInfo/__mocks__/SessionInfoManager";
import {
  LoginHandlerMock,
  LoginHandlerResponse
} from "../../../src/login/__mocks__/LoginHandler";
import URL from "url-parse";

describe("PopUpLoginHandler", () => {
  const defaultMocks = {
    environmentDetector: EnvironmentDetectorMock,
    loginHandler: LoginHandlerMock,
    sessionCreator: SessionInfoManagerMock
  };
  function getInitialisedHandler(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): PopUpLoginHandler {
    return new PopUpLoginHandler(
      mocks.environmentDetector ?? defaultMocks.environmentDetector,
      mocks.loginHandler ?? defaultMocks.loginHandler,
      mocks.sessionCreator ?? defaultMocks.sessionCreator
    );
  }

  describe("canHandle", () => {
    it("Accepts a configuration for popup", async () => {
      const handler = getInitialisedHandler();
      expect(
        await handler.canHandle({
          sessionId: "mySession",
          popUp: true,
          redirectUrl: new URL("/redirect")
        })
      ).toBe(true);
    });
    it("Rejects a configuration not for popup", async () => {
      const handler = getInitialisedHandler();
      expect(
        await handler.canHandle({
          sessionId: "mySession",
          popUp: false,
          redirectUrl: new URL("https://coolsite.com/redirect")
        })
      ).toBe(false);
    });
  });

  describe("handle", () => {
    it("is unimplemented", async () => {
      const handler = getInitialisedHandler();
      await expect(
        handler.handle({
          sessionId: "mySession",
          popUp: true
        })
      ).rejects.toThrow("Popup login is not implemented yet");
    });
  });
});
