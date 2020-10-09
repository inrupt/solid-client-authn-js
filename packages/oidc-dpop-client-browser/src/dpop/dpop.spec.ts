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

import URL from "url-parse";
import { describe, it } from "@jest/globals";

import {
  createHeaderToken,
  decodeJwt,
  generateJwk,
  generateKeyForDpop,
  generateRsaKey,
  normalizeHtu,
  signJwt,
} from "./dpop";

describe("generateJwk", () => {
  it("can generate a RSA-based JWK", async () => {
    const key = await generateJwk("RSA");
    expect(key.kty).toEqual("RSA");
  });

  it("can generate an elliptic curve-based JWK", async () => {
    const key = await generateJwk("EC", "P-256");
    expect(key.kty).toEqual("EC");
  });
});

describe("generateKeyForDpop", () => {
  it("generates an elliptic curve-base key, which is a sensible default for DPoP", async () => {
    const key = await generateKeyForDpop();
    expect(key.kty).toEqual("EC");
  });
});

describe("generateRsaKey", () => {
  it("generates an RSA key", async () => {
    const key = await generateRsaKey();
    expect(key.kty).toEqual("RSA");
  });
});

describe("signJwt/decodeJwt", () => {
  it("generates a JWT that can be decoded without signature verification", async () => {
    const key = await generateKeyForDpop();
    const payload = { testClaim: "testValue" };
    const jwt = await signJwt(payload, key, {
      algorithm: "RS256",
    });
    const decoded = await decodeJwt(jwt);
    expect(decoded.testClaim).toEqual(payload.testClaim);
  });

  it("can verify the ES256 signature of the generated JWT", async () => {
    const key = await generateKeyForDpop();
    const payload = { testClaim: "testValue" };
    const jwt = await signJwt(payload, key, {
      algorithm: "ES256",
    });
    const decoded = await decodeJwt(jwt, key, { algorithms: ["ES256"] });
    expect(decoded.testClaim).toEqual(payload.testClaim);
  });
});

describe("normalizeHtu", () => {
  [
    {
      it: "should not add a / if not present at the end of the url",
      url: new URL("https://audience.com"),
      expected: "https://audience.com",
    },
    {
      it: "should not change a URL with a slash at the end",
      url: new URL("https://audience.com/"),
      expected: "https://audience.com/",
    },
    {
      it: "should not include queries",
      url: new URL("https://audience.com?cool=stuff&dope=things"),
      expected: "https://audience.com",
    },
    {
      it: "should not include queries but still include a slash",
      url: new URL("https://audience.com/?cool=stuff&dope=things"),
      expected: "https://audience.com/",
    },
    {
      it: "should not include hash",
      url: new URL("https://audience.com#throwBackThursday"),
      expected: "https://audience.com",
    },
    {
      it: "should not include hash but include the slash",
      url: new URL("https://audience.com/#throwBackThursday"),
      expected: "https://audience.com/",
    },
    {
      it: "should include the path",
      url: new URL("https://audience.com/path"),
      expected: "https://audience.com/path",
    },
    {
      it: "should not include the username and password",
      url: new URL("https://jackson:badpassword@audience.com"),
      expected: "https://audience.com",
    },
    {
      it: "should include ports",
      url: new URL("https://localhost:8080/path"),
      expected: "https://localhost:8080/path",
    },
  ].forEach((test) => {
    it(test.it, () => {
      const htu = normalizeHtu(test.url);
      expect(htu).toBe(test.expected);
    });
  });
});

describe("createHeaderToken", () => {
  it("Properly builds a token when given a key", async () => {
    const key = await generateJwk("EC", "P-256", { alg: "ES256" });
    const token = await createHeaderToken(
      new URL("https://audience.com/"),
      "post",
      key
    );
    const decoded = await decodeJwt(token);
    expect(decoded.htu).toEqual("https://audience.com/");
    expect(decoded.htm).toEqual("post");
  });
});
