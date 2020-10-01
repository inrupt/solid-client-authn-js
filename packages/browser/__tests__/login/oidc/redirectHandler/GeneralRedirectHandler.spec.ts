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
import { TokenSaverMock } from "../../../../src/login/oidc/redirectHandler/__mocks__/TokenSaver";
import {
  SessionInfoManagerMock,
  SessionCreatorCreateResponse,
} from "../../../../src/sessionInfo/__mocks__/SessionInfoManager";
import GeneralRedirectHandler from "../../../../src/login/oidc/redirectHandler/GeneralRedirectHandler";

describe("GeneralRedirectHandler", () => {
  const defaultMocks = {
    tokenSaver: TokenSaverMock,
    sessionInfoManager: SessionInfoManagerMock,
  };

  function getGeneralRedirectHandler(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): GeneralRedirectHandler {
    return new GeneralRedirectHandler(
      mocks.tokenSaver ?? defaultMocks.tokenSaver,
      mocks.sessionInfoManager ?? defaultMocks.sessionInfoManager
    );
  }

  describe("canHandler", () => {
    it("Accepts a valid url with the correct query", async () => {
      const generalRedirectHandler = getGeneralRedirectHandler();
      expect(
        await generalRedirectHandler.canHandle(
          "https://coolparty.com/?id_token=token&access_token=otherToken&state=userId"
        )
      ).toBe(true);
    });

    it("Rejects an invalid url", async () => {
      const generalRedirectHandler = getGeneralRedirectHandler();
      expect(
        await generalRedirectHandler.canHandle("beep boop I am a robot")
      ).toBe(false);
    });

    it("Accepts a valid url with the incorrect query", async () => {
      const generalRedirectHandler = getGeneralRedirectHandler();
      expect(
        await generalRedirectHandler.canHandle(
          "https://coolparty.com/?meep=mop"
        )
      ).toBe(false);
    });
  });

  describe("handle", () => {
    it("Throws an error with invalid input", async () => {
      const generalRedirectHandler = getGeneralRedirectHandler();
      await expect(
        generalRedirectHandler.handle("Bad Input")
      ).rejects.toThrowError("Cannot handle redirect url [Bad Input]");
    });

    it("Transfers the correct url component to the session creator", async () => {
      const generalRedirectHandler = getGeneralRedirectHandler();
      expect(
        await generalRedirectHandler.handle(
          "https://coolsite/?id_token=a&access_token=b&state=c"
        )
      ).toBe(SessionCreatorCreateResponse);
      expect(defaultMocks.tokenSaver.saveSession).toHaveBeenCalledWith(
        "c",
        "a",
        "b"
      );
    });
  });
});
