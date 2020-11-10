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

import { describe, it } from "@jest/globals";

import {
  createDpopHeader,
  decodeJwt,
  normalizeHttpUriClaim,
  privateJwkToPublicJwk,
  signJwt,
} from "./dpop";
import { generateJwk, generateJwkForDpop } from "./keyGeneration";

describe("signJwt/decodeJwt", () => {
  it("generates a JWT that can be decoded without signature verification", async () => {
    const key = await generateJwkForDpop();
    const payload = { testClaim: "testValue" };
    const jwt = await signJwt(payload, key, {
      algorithm: "RS256",
    });
    const decoded = await decodeJwt(jwt);
    expect(decoded.testClaim).toEqual(payload.testClaim);
  });

  it("can verify the ES256 signature of the generated JWT", async () => {
    const key = await generateJwkForDpop();
    const payload = { testClaim: "testValue" };
    const jwt = await signJwt(payload, key, {
      algorithm: "ES256",
    });
    const decoded = await decodeJwt(jwt, await privateJwkToPublicJwk(key), {
      algorithms: ["ES256"],
    });
    expect(decoded.testClaim).toEqual(payload.testClaim);
  });

  it("throws if the ES256 signature of the generated JWT doesn't match the provided key", async () => {
    const goodKey = await generateJwkForDpop();
    const otherKey = await generateJwkForDpop();
    const payload = { testClaim: "testValue" };
    const jwt = await signJwt(payload, goodKey, {
      algorithm: "ES256",
    });
    await expect(() =>
      decodeJwt(jwt, otherKey, { algorithms: ["ES256"] })
    ).rejects.toThrow("invalid signature");
  });
});

describe("normalizeHttpUriClaim", () => {
  [
    {
      it: "should not add a / if not present at the end of the url",
      url: "https://audience.com",
      expected: "https://audience.com/",
    },
    {
      it: "should not change a URL with a slash at the end",
      url: "https://audience.com/",
      expected: "https://audience.com/",
    },
    {
      it: "should include queries",
      url: "https://audience.com?cool=stuff&dope=things",
      expected: "https://audience.com/?cool=stuff&dope=things",
    },
    {
      it: "should include queries and a slash",
      url: "https://audience.com/?cool=stuff&dope=things",
      expected: "https://audience.com/?cool=stuff&dope=things",
    },
    {
      it: "should not include hash",
      url: "https://audience.com#throwBackThursday",
      expected: "https://audience.com/",
    },
    {
      it: "should not include hash but include the slash",
      url: "https://audience.com/#throwBackThursday",
      expected: "https://audience.com/",
    },
    {
      it: "should include the path",
      url: "https://audience.com/path",
      expected: "https://audience.com/path",
    },
    {
      it: "should not include the username and password",
      url: "https://jackson:badpassword@audience.com",
      expected: "https://audience.com/",
    },
    {
      it: "should include ports",
      url: "https://localhost:8080/path",
      expected: "https://localhost:8080/path",
    },
  ].forEach((test) => {
    // The titles are provided in the test array
    // eslint-disable-next-line jest/valid-title
    it(test.it, () => {
      const htu = normalizeHttpUriClaim(test.url);
      expect(htu).toBe(test.expected);
    });
  });
});

describe("createDpopHeader", () => {
  it("properly builds a token when given a key", async () => {
    const key = await generateJwk("EC", "P-256", { alg: "ES256" });
    const token = await createDpopHeader("https://audience.com/", "post", key);
    const decoded = await decodeJwt(token);
    expect(decoded.htu).toEqual("https://audience.com/");
    expect(decoded.htm).toEqual("POST");
  });

  it("create the correct JWT headers", async () => {
    const key = await generateJwk("EC", "P-256", { alg: "ES256" });
    const publicKey = { ...key, d: undefined };
    const token = await createDpopHeader("https://audience.com/", "post", key);
    const decoded = await decodeJwt(token, key, {
      complete: true,
    });
    expect((decoded.header as Record<string, string>).alg).toEqual("ES256");
    expect((decoded.header as Record<string, string>).typ).toEqual("dpop+jwt");
    expect((decoded.header as Record<string, string>).jwk).toEqual(publicKey);
  });
});
