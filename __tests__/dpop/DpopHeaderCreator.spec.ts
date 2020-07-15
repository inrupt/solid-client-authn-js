/**
 * This project is a continuation of Inrupt's awesome solid-auth-fetcher project,
 * see https://www.npmjs.com/package/@inrupt/solid-auth-fetcher.
 * Copyright 2020 The Solid Project.
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
        it: "should not change a url",
        url: new URL("https://audience.com"),
        expected: "https://audience.com"
      },
      {
        it: "should not change a URL with a slash at the end",
        url: new URL("https://audience.com/"),
        expected: "https://audience.com/"
      },
      {
        it: "should not include queries",
        url: new URL("https://audience.com?cool=stuff&dope=things"),
        expected: "https://audience.com"
      },
      {
        it: "should not include queries but still include a slash",
        url: new URL("https://audience.com/?cool=stuff&dope=things"),
        expected: "https://audience.com/"
      },
      {
        it: "should not include hash",
        url: new URL("https://audience.com#throwBackThursday"),
        expected: "https://audience.com"
      },
      {
        it: "should not include hash but include the slash",
        url: new URL("https://audience.com/#throwBackThursday"),
        expected: "https://audience.com/"
      },
      {
        it: "should include the path",
        url: new URL("https://audience.com/path"),
        expected: "https://audience.com/path"
      },
      {
        it: "should not include the username and password",
        url: new URL("https://jackson:badpassword@audience.com"),
        expected: "https://audience.com"
      },
      {
        it: "should include ports",
        url: new URL("https://localhost:8080/path"),
        expected: "https://localhost:8080/path"
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
