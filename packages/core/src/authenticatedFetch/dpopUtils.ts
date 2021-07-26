/*
 * Copyright 2021 Inrupt Inc.
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

import {
  JWK,
  KeyLike,
  SignJWT,
  generateKeyPair,
  fromKeyLike,
} from "@inrupt/jose-legacy-modules";
import { v4 } from "uuid";
import { PREFERRED_SIGNING_ALG } from "../constant";

/**
 * Normalizes a URL in order to generate the DPoP token based on a consistent scheme.
 *
 * @param audience The URL to normalize.
 * @returns The normalized URL as a string.
 * @hidden
 */
function removeHashUsernameAndPassword(audience: string): string {
  const cleanedAudience = new URL(audience);
  cleanedAudience.hash = "";
  cleanedAudience.username = "";
  cleanedAudience.password = "";
  return cleanedAudience.toString();
}

export type KeyPair = {
  privateKey: KeyLike;
  publicKey: JWK;
};

/**
 * Creates a DPoP header according to https://tools.ietf.org/html/draft-fett-oauth-dpop-04,
 * based on the target URL and method, using the provided key.
 *
 * @param audience Target URL.
 * @param method HTTP method allowed.
 * @param key Key used to sign the token.
 * @returns A JWT that can be used as a DPoP Authorization header.
 */
export async function createDpopHeader(
  audience: string,
  method: string,
  dpopKey: KeyPair
): Promise<string> {
  return new SignJWT({
    htu: removeHashUsernameAndPassword(audience),
    htm: method.toUpperCase(),
    jti: v4(),
  })
    .setProtectedHeader({
      alg: PREFERRED_SIGNING_ALG[0],
      jwk: dpopKey.publicKey,
      typ: "dpop+jwt",
    })
    .setIssuedAt()
    .sign(dpopKey.privateKey, {});
}

export async function generateDpopKeyPair(): Promise<KeyPair> {
  const { privateKey, publicKey } = await generateKeyPair(
    PREFERRED_SIGNING_ALG[0]
  );
  const dpopKeyPair = {
    privateKey,
    publicKey: await fromKeyLike(publicKey),
  };
  // The alg property isn't set by fromKeyLike, so set it manually.
  dpopKeyPair.publicKey.alg = PREFERRED_SIGNING_ALG[0];
  return dpopKeyPair;
}
