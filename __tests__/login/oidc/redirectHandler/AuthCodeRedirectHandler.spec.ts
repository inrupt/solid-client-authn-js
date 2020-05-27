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
import { TokenSaverMock } from "../../../../src/login/oidc/redirectHandler/__mocks__/TokenSaver";
import { StorageUtilityMock } from "../../../../src/localStorage/__mocks__/StorageUtility";
import {
  IssuerConfigFetcherMock,
  IssuerConfigFetcherFetchConfigResponse
} from "../../../../src/login/oidc/__mocks__/IssuerConfigFetcher";
import { FetcherMock } from "../../../../src/util/__mocks__/Fetcher";
import {
  DpopHeaderCreatorMock,
  DpopHeaderCreatorResponse
} from "../../../../src/dpop/__mocks__/DpopHeaderCreator";
import AuthCodeRedirectHandler from "../../../../src/login/oidc/redirectHandler/AuthCodeRedirectHandler";
import { RedirectorMock } from "../../../../src/login/oidc/__mocks__/Redirector";
import { Response as NodeResponse } from "node-fetch";

describe("AuthCodeRedirectHandler", () => {
  const defaultMocks = {
    storageUtility: StorageUtilityMock,
    issuerConfigFetcher: IssuerConfigFetcherMock,
    fetcher: FetcherMock,
    dpopHeaderCreator: DpopHeaderCreatorMock,
    tokenSaver: TokenSaverMock,
    redirector: RedirectorMock
  };
  function getAuthCodeRedirectHandler(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): AuthCodeRedirectHandler {
    return new AuthCodeRedirectHandler(
      mocks.storageUtility ?? defaultMocks.storageUtility,
      mocks.issuerConfigFetcher ?? defaultMocks.issuerConfigFetcher,
      mocks.fetcher ?? defaultMocks.fetcher,
      mocks.dpopHeaderCreator ?? defaultMocks.dpopHeaderCreator,
      mocks.tokenSaver ?? defaultMocks.tokenSaver,
      mocks.redirector ?? defaultMocks.redirector
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
        .mockResolvedValueOnce("b")
        .mockResolvedValueOnce("c")
        .mockResolvedValueOnce("d")
        .mockResolvedValueOnce(null);
      defaultMocks.fetcher.fetch.mockResolvedValueOnce(
        /* eslint-disable @typescript-eslint/camelcase */
        (new NodeResponse(
          JSON.stringify({
            id_token: "idToken",
            access_token: "accessToken"
          })
        ) as unknown) as Response
        /* eslint-enable @typescript-eslint/camelcase */
      );
      const authCodeRedirectHandler = getAuthCodeRedirectHandler();
      await authCodeRedirectHandler.handle(
        "https://coolsite.com/?code=someCode&state=userId"
      );
      expect(defaultMocks.fetcher.fetch).toBeCalledWith(
        IssuerConfigFetcherFetchConfigResponse.tokenEndpoint,
        {
          method: "POST",
          headers: {
            DPoP: DpopHeaderCreatorResponse,
            "content-type": "application/x-www-form-urlencoded"
          },
          body:
            "client_id=c&grant_type=authorization_code&code_verifier=a&code=someCode&redirect_uri=d"
        }
      );
      expect(
        defaultMocks.tokenSaver.saveTokenAndGetSession
      ).toHaveBeenCalledWith("userId", "idToken", "accessToken", undefined);
    });

    it("makes a code request with a Basic authorization header if a secret is present", async () => {
      defaultMocks.storageUtility.getForUser
        .mockResolvedValueOnce("a")
        .mockResolvedValueOnce("b")
        .mockResolvedValueOnce("c")
        .mockResolvedValueOnce("d")
        .mockResolvedValueOnce("e");
      defaultMocks.fetcher.fetch.mockResolvedValueOnce(
        /* eslint-disable @typescript-eslint/camelcase */
        (new NodeResponse(
          JSON.stringify({
            id_token: "idToken",
            access_token: "accessToken"
          })
        ) as unknown) as Response
        /* eslint-enable @typescript-eslint/camelcase */
      );
      const authCodeRedirectHandler = getAuthCodeRedirectHandler();
      await authCodeRedirectHandler.handle(
        "https://coolsite.com/?code=someCode&state=userId"
      );
      expect(defaultMocks.fetcher.fetch).toBeCalledWith(
        IssuerConfigFetcherFetchConfigResponse.tokenEndpoint,
        {
          method: "POST",
          headers: {
            DPoP: DpopHeaderCreatorResponse,
            "content-type": "application/x-www-form-urlencoded",
            Authorization: "Basic Yzpl"
          },
          body:
            "client_id=c&grant_type=authorization_code&code_verifier=a&code=someCode&redirect_uri=d"
        }
      );
      expect(
        defaultMocks.tokenSaver.saveTokenAndGetSession
      ).toHaveBeenCalledWith("userId", "idToken", "accessToken", undefined);
    });
  });
});
