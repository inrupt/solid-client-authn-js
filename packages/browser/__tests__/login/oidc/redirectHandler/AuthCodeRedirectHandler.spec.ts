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
import {
  StorageUtilityMock,
  mockStorageUtility,
} from "@inrupt/solid-client-authn-core";
import AuthCodeRedirectHandler from "../../../../src/login/oidc/redirectHandler/AuthCodeRedirectHandler";
import { RedirectorMock } from "../../../../src/login/oidc/__mocks__/Redirector";
import { SessionInfoManagerMock } from "../../../../src/sessionInfo/__mocks__/SessionInfoManager";
import { JoseUtilityMock } from "../../../../src/jose/__mocks__/JoseUtility";
import { SigninResponse } from "@inrupt/oidc-dpop-client-browser";

jest.mock("@inrupt/oidc-dpop-client-browser", () => {
  return {
    OidcClient: jest.fn().mockImplementation(() => {
      return {
        processSigninResponse: (): Promise<SigninResponse> =>
          // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
          // @ts-ignore Ignore because we don't need to mock out all data fields.
          Promise.resolve({
            // eslint-disable-next-line @typescript-eslint/camelcase
            access_token: "test access token",
          }),
      };
    }),
  };
});

describe("AuthCodeRedirectHandler", () => {
  const defaultMocks = {
    joseUtility: JoseUtilityMock,
    storageUtility: StorageUtilityMock,
    redirector: RedirectorMock,
    sessionInfoManager: SessionInfoManagerMock,
  };

  function getAuthCodeRedirectHandler(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): AuthCodeRedirectHandler {
    return new AuthCodeRedirectHandler(
      mocks.joseUtility ?? defaultMocks.joseUtility,
      mocks.storageUtility ?? defaultMocks.storageUtility,
      mocks.redirector ?? defaultMocks.redirector,
      mocks.sessionInfoManager ?? defaultMocks.sessionInfoManager
    );
  }

  describe("canHandler", () => {
    it("Accepts a valid url with the correct query", async () => {
      const authCodeRedirectHandler = getAuthCodeRedirectHandler();
      expect(
        await authCodeRedirectHandler.canHandle(
          "https://coolparty.com/?code=someCode&state=oauth2_state_value"
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
      ).rejects.toThrowError("Cannot handle redirect url [Bad Input]");
    });

    it("Makes a code request to the correct place", async () => {
      const storage = mockStorageUtility({
        userId: {
          codeVerifier: "a",
          redirectUri: "b",
        },
      });

      const authCodeRedirectHandler = getAuthCodeRedirectHandler({
        storageUtility: storage,
      });

      await authCodeRedirectHandler.handle(
        "https://coolsite.com/?code=someCode&state=oauth2_state_value"
      );

      expect(defaultMocks.redirector.redirect).toHaveBeenCalledWith(
        "https://coolsite.com/",
        {
          redirectByReplacingState: true,
        }
      );
    });

    it("Fails if a session was not retrieved", async () => {
      defaultMocks.sessionInfoManager.get.mockResolvedValueOnce(undefined);

      const authCodeRedirectHandler = getAuthCodeRedirectHandler();
      await expect(
        authCodeRedirectHandler.handle(
          "https://coolsite.com/?code=someCode&state=oauth2_state_value"
        )
      ).rejects.toThrowError("Could not retrieve session");
    });
  });
});
