/**
 * Test for DPoPHeaderCreator
 */
import "reflect-metadata";
import JoseUtilityMocks from "../../../src/authenticator/__mocks__/JoseUtitlity";
import DpopClientKeyManagerMocks from "../../../src/util/dpop/__mocks__/DpopClientKeyManager";
import UuidGeneratorMocks from "../../../src/util/__mocks__/UuidGenerator";
import DpopHeaderCreator from "../../../src/util/dpop/DpopHeaderCreator";
import URL from "url-parse";

describe("DpopHeaderCreator", () => {
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  function initMocks() {
    const joseUtilityMocks = JoseUtilityMocks();
    const dpopClientKeyManagerMocks = DpopClientKeyManagerMocks();
    const uuidGeneratorMocks = UuidGeneratorMocks();
    const dpopHeaderCreator = new DpopHeaderCreator(
      joseUtilityMocks.JoseUtilityMock(),
      dpopClientKeyManagerMocks.DpopClientKeyManagerMock(),
      uuidGeneratorMocks.UuidGeneratorMock()
    );
    return {
      ...joseUtilityMocks,
      ...dpopClientKeyManagerMocks,
      ...uuidGeneratorMocks,
      dpopHeaderCreator
    };
  }

  describe("createHeaderToken", () => {
    it("Properly builds a token", async () => {
      const mocks = initMocks();
      const token = await mocks.dpopHeaderCreator.createHeaderToken(
        new URL("https://audience.com"),
        "post"
      );
      expect(token).toBe(mocks.JoseUtilityMockSignJWTResponse);
    });
  });
});
