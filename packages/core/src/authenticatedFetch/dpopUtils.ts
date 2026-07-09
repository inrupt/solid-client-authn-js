// Copyright Inrupt Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
// Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

import type { JWK, CryptoKey } from "jose";
import { SignJWT, generateKeyPair, exportJWK, base64url } from "jose";
import { v4 } from "uuid";
import { PREFERRED_SIGNING_ALG } from "../constant";

/**
 * Normalizes a URL in order to generate the DPoP token based on a consistent scheme.
 *
 * @param audience The URL to normalize.
 * @returns The normalized URL as a string.
 * @hidden
 */
function normalizeHTU(audience: string): string {
  const audienceUrl = new URL(audience);
  return new URL(audienceUrl.pathname, audienceUrl.origin).toString();
}

export type KeyPair = {
  privateKey: CryptoKey;
  publicKey: JWK;
};

/**
 * Computes the RFC 9449 `ath` claim: the base64url-encoded SHA-256 hash of the
 * ASCII encoding of the access token's value (RFC 9449 §4.2). Uses the WHATWG
 * Web Crypto API (`crypto.subtle`) — the same cross-platform primitive `jose`
 * relies on, available in browsers and the Node versions `jose` v6 supports.
 *
 * @hidden
 */
async function accessTokenHash(accessToken: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(accessToken),
  );
  return base64url.encode(new Uint8Array(digest));
}

/**
 * Creates a DPoP header according to {@link https://www.rfc-editor.org/rfc/rfc9449 RFC 9449},
 * based on the target URL and method, using the provided key.
 *
 * @param audience Target URL.
 * @param method HTTP method allowed.
 * @param dpopKey Key used to sign the token.
 * @param accessToken When provided, the proof is bound to this access token via the
 * RFC 9449 `ath` claim. This is REQUIRED (RFC 9449 §7) whenever the DPoP proof
 * accompanies an access token to a protected resource — without it, a correctly
 * enforcing resource server rejects the request with 401.
 * @returns A JWT that can be used as a DPoP Authorization header.
 */
export async function createDpopHeader(
  audience: string,
  method: string,
  dpopKey: KeyPair,
  accessToken?: string,
): Promise<string> {
  return new SignJWT({
    htu: normalizeHTU(audience),
    htm: method.toUpperCase(),
    jti: v4(),
    ...(accessToken !== undefined
      ? { ath: await accessTokenHash(accessToken) }
      : {}),
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
    PREFERRED_SIGNING_ALG[0],
    { extractable: true },
  );
  const dpopKeyPair = {
    privateKey,
    publicKey: await exportJWK(publicKey),
  };
  // The alg property isn't set by exportJWK, so set it manually.
  [dpopKeyPair.publicKey.alg] = PREFERRED_SIGNING_ALG;
  return dpopKeyPair;
}
