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

/**
 * Test for DPoPHeaderCreator
 */
import "reflect-metadata";
import { JoseUtilityMock } from "../../src/jose/__mocks__/JoseUtility";
import { mockDpopClientKeyManager } from "../../src/dpop/__mocks__/DpopClientKeyManager";
import { UuidGeneratorMock } from "../../src/util/__mocks__/UuidGenerator";
import DpopHeaderCreator from "../../src/dpop/DpopHeaderCreator";
import URL from "url-parse";
import { generateJwk } from "../../src/jose/IsomorphicJoseUtility";
import { decodeJwt } from "@inrupt/oidc-dpop-client-browser";

describe("DpopHeaderCreator", () => {
  const defaultMocks = {
    joseUtility: JoseUtilityMock,
    dpopClientKeyManager: mockDpopClientKeyManager(undefined),
    uuidGenerator: UuidGeneratorMock,
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

  describe("DpopHeaderCreator.createDpopHeader", () => {
    it("Properly builds a token by retrieving the stored key", async () => {
      const key = await generateJwk("EC", "P-256", { alg: "ES256" });
      const dpopHeaderCreator = getDpopHeaderCreator({
        dpopClientKeyManager: mockDpopClientKeyManager(key),
      });
      const token = await dpopHeaderCreator.createDpopHeader(
        new URL("https://audience.com/"),
        "post"
      );
      const decoded = await decodeJwt(token);
      expect(decoded.htu).toEqual("https://audience.com/");
      expect(decoded.htm).toEqual("post");
    });

    it("Fails if no client key is provided", async () => {
      const dpopHeaderCreator = getDpopHeaderCreator({
        dpopClientKeyManager: mockDpopClientKeyManager(undefined),
      });
      await expect(
        dpopHeaderCreator.createDpopHeader(
          new URL("https://audience.com"),
          "post"
        )
      ).rejects.toThrowError(
        "Could not obtain the key to sign the token with."
      );
    });
  });
});
