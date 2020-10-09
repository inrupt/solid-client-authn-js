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
 * Interface defining how each environment should define its crypto system
 */
import { ECCurve, BasicParameters, OKPCurve, JSONWebKey } from "jose";
import JWT from "jsonwebtoken";

/**
 * @hidden
 */
export default interface IJoseUtility {
  /**
   * Generates a keystore
   * @param kty Type of key
   * @param crv A curve or bitlength
   * @param parameters Parameters to generate the key
   * @param isPrivate True if a private token should be generated
   */
  generateJwk(
    kty: "EC",
    crv?: ECCurve,
    parameters?: BasicParameters,
    isPrivate?: boolean
  ): Promise<JSONWebKey>;
  generateJwk(
    kty: "OKP",
    crv?: OKPCurve,
    parameters?: BasicParameters,
    isPrivate?: boolean
  ): Promise<JSONWebKey>;
  generateJwk(
    kty: "RSA",
    bitlength?: number,
    parameters?: BasicParameters,
    isPrivate?: boolean
  ): Promise<JSONWebKey>;
  generateJwk(
    kty: "oct",
    bitlength?: number,
    parameters?: BasicParameters
  ): Promise<JSONWebKey>;
  /**
   * Converts a privake key to a public key
   * @param jwk The given private key
   */
  privateJwkToPublicJwk(jwk: JSONWebKey): Promise<JSONWebKey>;

  /**
   * Decodes a JSON Web Token
   * @param token The encoded token
   */
  decodeJwt(token: string): Promise<Record<string, unknown>>;
  /**
   * Creates a JSON Web Token
   * @param payload Custom fields to be included
   * @param key Private JWK
   * @param options Common fields on tokens
   */
  signJwt(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: Record<string, any>,
    key: JSONWebKey,
    options?: JWT.SignOptions
  ): Promise<string>;

  generateCodeVerifier(): Promise<string>;

  generateCodeChallenge(verifier: string): Promise<string>;
}
