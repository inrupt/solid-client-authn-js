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
  SessionCreatorMock,
  SessionCreatorCreateResponse
} from "../../../src/solidSession/__mocks__/SessionCreator";
import {
  LoginHandlerMock,
  LoginHandlerResponse
} from "../../../src/login/__mocks__/LoginHandler";
import URL from "url-parse";
import INeededRedirectAction from "../../../src/solidSession/INeededRedirectAction";

describe("PopUpLoginHandler", () => {
  const defaultMocks = {
    environmentDetector: EnvironmentDetectorMock,
    loginHandler: LoginHandlerMock,
    sessionCreator: SessionCreatorMock
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
          popUp: true,
          popUpRedirectPath: "/redirect"
        })
      ).toBe(true);
    });
    it("Rejects a configuration not for popup", async () => {
      const handler = getInitialisedHandler();
      expect(
        await handler.canHandle({
          popUp: false,
          redirect: new URL("https://coolsite.com/redirect")
        })
      ).toBe(false);
    });
  });

  describe("handle", () => {
    it("can handle popup", async () => {
      const { open } = window;
      delete window.open;
      const popUpWindowObject = {
        closed: false
      } as Window;
      window.open = jest.fn(() => popUpWindowObject);

      const handler = getInitialisedHandler();
      setTimeout(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (popUpWindowObject as any).closed = true;
      }, 1000);
      const session = await handler.handle({
        popUp: true,
        popUpRedirectPath: "/redirect"
      });
      expect(window.open).toHaveBeenCalledWith(
        (LoginHandlerResponse.neededAction as INeededRedirectAction)
          .redirectUrl,
        "Log In",
        "resizable,scrollbars,width=500,height=500,"
      );
      expect(session).toBe(SessionCreatorCreateResponse);

      window.open = open;
    });
  });
});
