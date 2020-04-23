/**
 * Test for DPoPHeaderCreator
 */
import "reflect-metadata";
import {
  JoseUtilityMock,
  JoseUtilitySignJWTResponse
} from "../../src/jose/__mocks__/JoseUtility";
import { DpopClientKeyManagerMock } from "../../src/dpop/__mocks__/DpopClientKeyManager";
import { UuidGeneratorMock } from "../../src/util/__mocks__/UuidGenerator";
import DpopHeaderCreator from "../../src/dpop/DpopHeaderCreator";
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
      expect(token).toBe(JoseUtilitySignJWTResponse);
    });

    it("Fails if no client key is provided", async () => {
      const dpopClientKeyManagerMock = DpopClientKeyManagerMock;
      dpopClientKeyManagerMock.getClientKey.mockReturnValueOnce(
        Promise.resolve(null)
      );
      const dpopHeaderCreator = getDpopHeaderCreator({
        dpopClientKeyManager: dpopClientKeyManagerMock
      });
      await expect(
        dpopHeaderCreator.createHeaderToken(
          new URL("https://audience.com"),
          "post"
        )
      ).rejects.toThrowError(
        "Could not obtain the key to sign the token with."
      );
    });
  });

  describe("normalizeHtu", () => {
    [
      {
        it: "should add a slash to the end of URLs",
        url: new URL("https://audience.com"),
        expected: "https://audience.com/"
      },
      {
        it: "should not add additional slashes to the end of URLs",
        url: new URL("https://audience.com/"),
        expected: "https://audience.com/"
      },
      {
        it: "should not include queries",
        url: new URL("https://audience.com?cool=stuff&dope=things"),
        expected: "https://audience.com/"
      },
      {
        it: "should not include hash",
        url: new URL("https://audience.com#throwBackThursday"),
        expected: "https://audience.com/"
      },
      {
        it: "should include the path",
        url: new URL("https://audience.com/path"),
        expected: "https://audience.com/path/"
      },
      {
        it: "should not include the username and password",
        url: new URL("https://jackson:badpassword@audience.com"),
        expected: "https://audience.com/"
      },
      {
        it: "should include ports",
        url: new URL("https://localhost:8080/path"),
        expected: "https://localhost:8080/path/"
      }
    ].forEach(test => {
      it(test.it, () => {
        const dpopHeaderCreator = getDpopHeaderCreator();
        const htu = dpopHeaderCreator.normalizeHtu(test.url);
        expect(htu).toBe(test.expected);
      });
    });
  });
});
