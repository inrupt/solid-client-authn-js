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
 * @hidden
 * @packageDocumentation
 */

/**
 * File for NodeJS-compatible JOSE
 */
import { ECCurve, BasicParameters, OKPCurve, JSONWebKey } from "jose";
import { JWK } from "node-jose";
import IJoseUtility from "./IJoseUtility";
import randomString from "crypto-random-string";
import crypto from "crypto";
import {
  signJWT,
  decodeJWT,
  privateJWKToPublicJWK,
} from "@inrupt/oidc-dpop-client-browser";

/**
 * Generates a Json Web Key
 * @param kty Key type
 * @param crvBitlength Curve length (nly relevant for elliptic curve algorithms)
 * @param parameters
 */
export async function generateJWK(
  kty: "EC" | "OKP" | "RSA" | "oct",
  crvBitlength?: ECCurve | OKPCurve | number,
  parameters?: BasicParameters
): Promise<JSONWebKey> {
  const key = await JWK.createKey(kty, crvBitlength, parameters);
  return key.toJSON(true) as JSONWebKey;
}

/**
 * Generates a PKCE (https://tools.ietf.org/html/rfc7636) token.
 * @returns A random string usable as a code verifier.
 * @hidden
 */
export async function generateCodeVerifier(): Promise<string> {
  return randomString({ length: 10, type: "base64" });
}

/**
 * Hashes the code verifier to create a code challenge.
 * @param verifier A PKCE token.
 * @returns A SHA-256 hash of the input token.
 * @hidden
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const hash = crypto.createHash("sha256");
  hash.update(verifier);
  return hash
    .digest()
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * @hidden
 */
export default class IsomorphicJoseUtility implements IJoseUtility {
  generateJWK = generateJWK;

  signJWT = signJWT;

  decodeJWT = decodeJWT;

  privateJWKToPublicJWK = privateJWKToPublicJWK;

  generateCodeVerifier = generateCodeVerifier;

  generateCodeChallenge = generateCodeChallenge;
}
