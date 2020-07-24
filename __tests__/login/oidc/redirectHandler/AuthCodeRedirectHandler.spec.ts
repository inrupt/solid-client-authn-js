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

import "reflect-metadata";
import { StorageUtilityMock } from "../../../../src/storage/__mocks__/StorageUtility";
import AuthCodeRedirectHandler from "../../../../src/login/oidc/redirectHandler/AuthCodeRedirectHandler";
import { RedirectorMock } from "../../../../src/login/oidc/__mocks__/Redirector";
import { SessionCreatorMock } from "../../../../src/sessionInfo/__mocks__/SessionCreator";
import { TokenRequesterMock } from "../../../../src/login/oidc/__mocks__/TokenRequester";

describe("AuthCodeRedirectHandler", () => {
  const defaultMocks = {
    storageUtility: StorageUtilityMock,
    redirector: RedirectorMock,
    tokenRequester: TokenRequesterMock,
    sessionCreator: SessionCreatorMock
  };
  function getAuthCodeRedirectHandler(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): AuthCodeRedirectHandler {
    return new AuthCodeRedirectHandler(
      mocks.storageUtility ?? defaultMocks.storageUtility,
      mocks.redirector ?? defaultMocks.redirector,
      mocks.tokenRequester ?? defaultMocks.tokenRequester,
      mocks.sessionCreator ?? defaultMocks.sessionCreator
    );
  }

  describe("canHandler", () => {
    it("Accepts a valid url with the correct query", async () => {
      const authCodeRedirectHandler = getAuthCodeRedirectHandler();
      expect(
        await authCodeRedirectHandler.canHandle(
          "https://coolparty.com/?code=someCode&state=userId"
        )
      ).toBe(true);
    });

    it("Rejects an invalid url", async () => {
      const authCodeRedirectHandler = getAuthCodeRedirectHandler();
      expect(
        await authCodeRedirectHandler.canHandle("beep boop I am a robot")
      ).toBe(false);
    });

    it("Rejects a valid url with the incorrect query", async () => {
      const authCodeRedirectHandler = getAuthCodeRedirectHandler();
      expect(
        await authCodeRedirectHandler.canHandle(
          "https://coolparty.com/?meep=mop"
        )
      ).toBe(false);
    });
  });

  describe("handle", () => {
    it("Throws an error with invalid input", async () => {
      const authCodeRedirectHandler = getAuthCodeRedirectHandler();
      await expect(
        authCodeRedirectHandler.handle("Bad Input")
      ).rejects.toThrowError("Cannot handle redirect url Bad Input");
    });

    it("Makes a code request to the correct place", async () => {
      defaultMocks.storageUtility.getForUser
        .mockResolvedValueOnce("a")
        .mockResolvedValueOnce("b");
      const authCodeRedirectHandler = getAuthCodeRedirectHandler();
      await authCodeRedirectHandler.handle(
        "https://coolsite.com/?code=someCode&state=userId"
      );
      expect(defaultMocks.tokenRequester.request).toHaveBeenCalledWith(
        "userId",
        /* eslint-disable @typescript-eslint/camelcase */
        {
          code: "someCode",
          code_verifier: "a",
          grant_type: "authorization_code",
          redirect_uri: "b"
        }
        /* eslint-enable @typescript-eslint/camelcase */
      );
      expect(defaultMocks.redirector.redirect).toHaveBeenCalledWith(
        "https://coolsite.com/",
        {
          redirectByReplacingState: true
        }
      );
    });

    it("Fails if a session was not retrieved", async () => {
      defaultMocks.storageUtility.getForUser
        .mockResolvedValueOnce("a")
        .mockResolvedValueOnce("b");
      defaultMocks.sessionCreator.getSession.mockResolvedValueOnce(null);
      const authCodeRedirectHandler = getAuthCodeRedirectHandler();
      await expect(
        authCodeRedirectHandler.handle(
          "https://coolsite.com/?code=someCode&state=userId"
        )
      ).rejects.toThrowError("There was a problem creating a session.");
    });
  });
});
