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
import {
  JWKECKey,
  ECCurve,
  BasicParameters,
  OKPCurve,
  JWKOKPKey,
  JWKRSAKey,
  JWKOctKey,
  JWT as JoseJWT,
  JSONWebKey,
} from "jose";
import { JWK } from "node-jose";
import JWT from "jsonwebtoken";
import IJoseUtility from "./IJoseUtility";
import randomString from "crypto-random-string";
import crypto from "crypto";

/**
 * @hidden
 */
export default class IsomorphicJoseUtility implements IJoseUtility {
  async generateJWK(
    kty: "EC" | "OKP" | "RSA" | "oct",
    crvBitlength?: ECCurve | OKPCurve | number,
    parameters?: BasicParameters
  ): Promise<JSONWebKey> {
    const key = await JWK.createKey(kty, crvBitlength, parameters);
    return key.toJSON(true) as JSONWebKey;
  }

  async signJWT(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: Record<string, any>,
    key: JWKECKey | JWKOKPKey | JWKRSAKey | JWKOctKey,
    options?: JoseJWT.SignOptions
  ): Promise<string> {
    const parsedKey = await JWK.asKey(key);
    const convertedKey: string = parsedKey.toPEM(true);
    const signed = JWT.sign(payload, convertedKey, {
      ...(options as JWT.SignOptions),
    });
    return signed;
  }

  // TODO: also should have functionality to validate the token
  async decodeJWT(token: string): Promise<Record<string, unknown>> {
    return JWT.decode(token) as Promise<Record<string, unknown>>;
  }

  async privateJWKToPublicJWK(key: JSONWebKey): Promise<JSONWebKey> {
    return (await JWK.asKey(key as JWK.RawKey, "public")) as JSONWebKey;
  }

  async generateCodeVerifier(): Promise<string> {
    return randomString({ length: 10, type: "base64" });
  }

  async generateCodeChallenge(verifier: string): Promise<string> {
    const hash = crypto.createHash("sha256");
    hash.update(verifier);
    return hash
      .digest()
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  }
}
