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

import { generateJwk, generateJwkForDpop, generateJwkRsa } from "./keyGen";

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

describe("generateJwkForDpop", () => {
  it("generates an elliptic curve-base key, which is a sensible default for DPoP", async () => {
    const key = await generateJwkForDpop();
    expect(key.kty).toEqual("EC");
  });
});

describe("generateJwkRsa", () => {
  it("generates an RSA key", async () => {
    const key = await generateJwkRsa();
    expect(key.kty).toEqual("RSA");
  });
});
