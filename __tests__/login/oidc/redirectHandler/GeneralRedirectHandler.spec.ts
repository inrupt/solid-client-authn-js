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
import GeneralRedirectHandler from "../../../../src/login/oidc/redirectHandler/GeneralRedirectHandler";

describe("GeneralRedirectHandler", () => {
  const defaultMocks = {
    tokenSaver: TokenSaverMock
  };
  function getGeneralRedirectHandler(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): GeneralRedirectHandler {
    return new GeneralRedirectHandler(
      mocks.tokenSaver ?? defaultMocks.tokenSaver
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
      ).rejects.toThrowError("Cannot handle redirect url Bad Input");
    });

    it("Transfers the correct url component to the session creator", async () => {
      const generalRedirectHandler = getGeneralRedirectHandler();
      expect(
        await generalRedirectHandler.handle(
          "https://coolsite/?id_token=a&access_token=b&state=c"
        )
      ).toBe(TokenSaverSaveTokenAndGetSessionResponse);
      expect(
        defaultMocks.tokenSaver.saveTokenAndGetSession
      ).toHaveBeenCalledWith("c", "a", "b");
    });
  });
});
