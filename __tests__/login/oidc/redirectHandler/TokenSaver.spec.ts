/**
 * Proprietary and Confidential
 *
 * Copyright 2020 Inrupt Inc. - all rights reserved.
 *
 * Do not use without explicit permission from Inrupt Inc.
 */

import "reflect-metadata";
import TokenSaver from "../../../../src/login/oidc/redirectHandler/TokenSaver";
import { SessionCreatorMock } from "../../../../src/solidSession/__mocks__/SessionCreator";
import { JoseUtilityMock } from "../../../../src/jose/__mocks__/JoseUtility";
import { StorageUtilityMock } from "../../../../src/localStorage/__mocks__/StorageUtility";

/**
 * Test for TokenSaver
 */
describe("TokenSaver", () => {
  const defaultMocks = {
    sessionCreator: SessionCreatorMock,
    joseUtility: JoseUtilityMock,
    storageUtility: StorageUtilityMock
  };
  function getTokenSaver(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): TokenSaver {
    return new TokenSaver(
      mocks.sessionCreator ?? defaultMocks.sessionCreator,
      mocks.joseUtility ?? defaultMocks.joseUtility,
      mocks.storageUtility ?? defaultMocks.storageUtility
    );
  }

  describe("saveTokenAndGetSession", () => {
    it("Saves token and returns session", async () => {
      const tokenSaver = getTokenSaver();
      // TODO: write this test once you have the right tokens
    });
  });
});
