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
import { JWK } from "node-jose";
import {
  BasicParameters,
  ECCurve,
  JSONWebKey,
  JWKECKey,
  JWKOctKey,
  JWKOKPKey,
  JWKRSAKey,
  OKPCurve,
  JWT as JoseJWT,
} from "jose";
import JWT, { VerifyOptions } from "jsonwebtoken";
import { v4 } from "uuid";

/**
 * Generates a Json Web Key
 * @param kty Key type
 * @param crvBitlength Curve length (only relevant for elliptic curve algorithms)
 * @param parameters
 * @hidden
 */
export async function generateJWK(
  kty: "EC" | "RSA",
  crvBitlength?: ECCurve | OKPCurve | number,
  parameters?: BasicParameters
): Promise<JSONWebKey> {
  const key = await JWK.createKey(kty, crvBitlength, parameters);
  return key.toJSON(true) as JSONWebKey;
}

/**
 * Generates a Json Web Token (https://tools.ietf.org/html/rfc7519) containing
 * the provided payload and using the signature algorithm specified in the options.
 * @param payload The body of the JWT.
 * @param key The key used for the signature.
 * @param options
 * @returns a 3-parts base64-encoded string, split by dots.
 * @hidden
 */
export async function signJWT(
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

/**
 * Decodes the base64 Json Web Token into an object. If a key is specified, the
 * JWT is also verified.
 * @param token The base64-encoded token
 * @param key The key used to sign the token
 * @returns the payload of the JWT
 * @hidden
 */
export async function decodeJWT(
  token: string,
  key?: JWKECKey | JWKOKPKey | JWKRSAKey | JWKOctKey,
  options?: VerifyOptions
): Promise<Record<string, unknown>> {
  if (key) {
    const parsedKey = await JWK.asKey(key);
    const convertedKey: string = parsedKey.toPEM(false);
    return JWT.verify(token, convertedKey, options) as Promise<
      Record<string, unknown>
    >;
  }
  return JWT.decode(token) as Promise<Record<string, unknown>>;
}

/**
 * @param key
 * @hidden
 */
export async function privateJWKToPublicJWK(
  key: JSONWebKey
): Promise<JSONWebKey> {
  return (await JWK.asKey(key as JWK.RawKey, "public")) as JSONWebKey;
}

/**
 * Normalizes a URL in order to generate the DPoP token based on a consistent scheme.
 * @param audience The URL to normalize.
 * @returns The normalized URL as a string.
 * @hidden
 */
export function normalizeHtu(audience: URL): string {
  return `${audience.origin}${audience.pathname}`;
}

/**
 * Creates a DPoP header according to https://tools.ietf.org/html/draft-fett-oauth-dpop-04,
 * based on the target URL and method, using the provided key.
 * @param audience Target URL.
 * @param method HTTP method allowed.
 * @param key Key used to sign the token.
 * @returns A JWT that can be used as a DPoP Authorization header.
 */
export async function createHeaderToken(
  audience: URL,
  method: string,
  key: JSONWebKey
): Promise<string> {
  return signJWT(
    {
      htu: normalizeHtu(audience),
      htm: method,
      jti: v4(),
    },
    key,
    {
      header: {
        jwk: privateJWKToPublicJWK(key),
        typ: "dpop+jwt",
      },
      expiresIn: "1 hour",
      algorithm: "ES256",
    }
  );
}

/**
 * Generates a JSON Web Key suitable to be used to sign HTTP request headers.
 */
export async function generateKeyForDpop(): Promise<JSONWebKey> {
  return generateJWK("EC", "P-256", { alg: "ES256" });
}

/**
 * Generates a JSON Web Key based on the RSA algorithm
 */
export async function generateRsaKey(): Promise<JSONWebKey> {
  return generateJWK("RSA");
}
