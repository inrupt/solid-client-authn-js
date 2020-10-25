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
import { JSONWebKey, JWKECKey, JWKOctKey, JWKOKPKey, JWKRSAKey } from "jose";
import JWT, { VerifyOptions } from "jsonwebtoken";
import { v4 } from "uuid";

/**
 * Generates a Json Web Token (https://tools.ietf.org/html/rfc7519) containing
 * the provided payload and using the signature algorithm specified in the options.
 * @param payload The body of the JWT.
 * @param key The key used for the signature.
 * @param options
 * @returns a 3-parts base64-encoded string, split by dots.
 * @hidden
 */
export async function signJwt(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any>,
  key: JWKECKey | JWKOKPKey | JWKRSAKey | JWKOctKey,
  options?: JWT.SignOptions
): Promise<string> {
  const parsedKey = await JWK.asKey(key);
  const convertedKey: string = parsedKey.toPEM(true);
  const signed = JWT.sign(payload, convertedKey, options);
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
export async function decodeJwt(
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
export async function privateJwkToPublicJwk(
  key: JSONWebKey
): Promise<JSONWebKey> {
  return (await JWK.asKey(key, "public")) as JSONWebKey;
}

/**
 * Normalizes a URL in order to generate the DPoP token based on a consistent scheme.
 * @param audience The URL to normalize.
 * @returns The normalized URL as a string.
 * @hidden
 */
export function normalizeHttpUriClaim(audience: URL): string {
  const cleanedAudience = new URL(audience.href);
  cleanedAudience.set("hash", "");
  cleanedAudience.set("username", "");
  cleanedAudience.set("password", "");
  return cleanedAudience.href;
}

/**
 * Creates a DPoP header according to https://tools.ietf.org/html/draft-fett-oauth-dpop-04,
 * based on the target URL and method, using the provided key.
 * @param audience Target URL.
 * @param method HTTP method allowed.
 * @param key Key used to sign the token.
 * @returns A JWT that can be used as a DPoP Authorization header.
 */
export async function createDpopHeader(
  audience: URL,
  method: string,
  key: JSONWebKey
): Promise<string> {
  return signJwt(
    {
      htu: normalizeHttpUriClaim(audience),
      htm: method.toUpperCase(),
      jti: v4(),
    },
    key,
    {
      header: {
        // TODO: Add a test
        jwk: await privateJwkToPublicJwk(key),
        typ: "dpop+jwt",
      },
      algorithm: "ES256",
    }
  );
}
