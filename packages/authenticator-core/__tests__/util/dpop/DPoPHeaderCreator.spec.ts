/**
 * Test for DPoPHeaderCreator
 */
import "reflect-metadata";
import JoseUtilityMocks from "../../authenticator/JoseUtitlity.mock";
import DPoPClientKeyManagerMocks from "./DPoPClientKeyManager.mock";
import UUIDGeneratorMocks from "../UUIDGenerator.mock";
import DPoPHeaderCreator from "../../../src/util/dpop/DPoPHeaderCreator";
import URL from "url-parse";

describe("DPoPHeaderCreator", () => {
  function initMocks() {
    const joseUtilityMocks = JoseUtilityMocks();
    const dPoPClientKeyManagerMocks = DPoPClientKeyManagerMocks();
    const uuidGeneratorMocks = UUIDGeneratorMocks();
    const dPoPHeaderCreator = new DPoPHeaderCreator(
      joseUtilityMocks.JoseUtilityMock(),
      dPoPClientKeyManagerMocks.DPoPClientKeyManagerMock(),
      uuidGeneratorMocks.UUIDGeneratorMock()
    );
    return {
      ...joseUtilityMocks,
      ...dPoPClientKeyManagerMocks,
      ...uuidGeneratorMocks,
      dPoPHeaderCreator
    };
  }

  describe("createHeaderToken", () => {
    it("Properly builds a token", async () => {
      const mocks = initMocks();
      const token = await mocks.dPoPHeaderCreator.createHeaderToken(
        new URL("https://audience.com"),
        "post"
      );
      expect(token).toBe(mocks.JoseUtilityMockSignJWTResponse);
    });
  });
});
