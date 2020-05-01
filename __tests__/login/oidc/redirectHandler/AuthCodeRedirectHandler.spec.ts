/**
 * Proprietary and Confidential
 *
 * Copyright 2020 Inrupt Inc. - all rights reserved.
 *
 * Do not use without explicit permission from Inrupt Inc.
 */

import "reflect-metadata";
import {
  TokenSaverMock,
  TokenSaverSaveTokenAndGetSessionResponse
} from "../../../../src/login/oidc/redirectHandler/__mocks__/TokenSaver";
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
        .mockResolvedValueOnce("d");
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
      ).toHaveBeenCalledWith("userId", "idToken", "accessToken");
    });
  });
});
