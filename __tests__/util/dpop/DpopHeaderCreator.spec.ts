/**
 * Test for DPoPHeaderCreator
 */
import "reflect-metadata";
import {
  JoseUtilityMock,
  JoseUtilityMockSignJWTResponse
} from "../../../src/authenticator/__mocks__/JoseUtitlity";
import { DpopClientKeyManagerMock } from "../../../src/util/dpop/__mocks__/DpopClientKeyManager";
import { UuidGeneratorMock } from "../../../src/util/__mocks__/UuidGenerator";
import DpopHeaderCreator from "../../../src/util/dpop/DpopHeaderCreator";
import URL from "url-parse";

describe("DpopHeaderCreator", () => {
  const defaultMocks = {
    joseUtility: JoseUtilityMock,
    dpopClientKeyManager: DpopClientKeyManagerMock,
    uuidGenerator: UuidGeneratorMock
  };
  function getDpopHeaderCreator(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): DpopHeaderCreator {
    const dpopHeaderCreator = new DpopHeaderCreator(
      mocks.joseUtility ?? defaultMocks.joseUtility,
      mocks.dpopClientKeyManager ?? defaultMocks.dpopClientKeyManager,
      mocks.uuidGenerator ?? defaultMocks.uuidGenerator
    );
    return dpopHeaderCreator;
  }

  describe("createHeaderToken", () => {
    it("Properly builds a token", async () => {
      const dpopHeaderCreator = getDpopHeaderCreator();
      const token = await dpopHeaderCreator.createHeaderToken(
        new URL("https://audience.com"),
        "post"
      );
      expect(token).toBe(JoseUtilityMockSignJWTResponse);
    });
  });
});
