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

// ---------------------------------------------------------------------------
// MIGRATION POC (proposal/migrate-to-oauth4webapi)
// ---------------------------------------------------------------------------
// This file is the *first slice* of the oauth4webapi + `dpop` migration
// described in `MIGRATION-oauth4webapi.md` at the repo root.
//
// Before: `createDpopHeader` hand-rolled a DPoP proof JWT with jose's `SignJWT`,
// and (after PR #4292) hand-computed the RFC 9449 §4.2 `ath` claim with
// `crypto.subtle.digest`.
//
// After: the proof is produced by panva's `dpop` package (`DPoP.generateProof`,
// same author as `jose`). Passing the access token as the final argument makes
// the `ath` claim automatic and spec-correct, so this POC *subsumes PR #4292*
// (the manual `ath` fix) by getting `ath` for free from the library. The `jti`,
// `htu` normalisation, `iat`, and the `jwk`/`typ: dpop+jwt` protected header are
// all handled inside `dpop` too — so the hand-rolled body below shrinks to a
// thin adapter.
//
// The only impedance mismatch: inrupt's public `KeyPair` type stores
// `publicKey` as a `JWK` (it is serialised into IndexedDB / session storage),
// whereas `DPoP.generateProof` expects a `CryptoKeyPair` whose `publicKey` is a
// `CryptoKey`. We bridge that here by importing the JWK back to a `CryptoKey`
// with jose's `importJWK`. The *full* migration (Phase 2+) keeps the DPoP key as
// an `oauth.generateKeyPair("ES256", { extractable: false })` `CryptoKeyPair`
// end-to-end and threads a single `oauth.DPoP()` handle through the token grants,
// eliminating this JWK round-trip entirely (see the doc).
// ---------------------------------------------------------------------------

import type { JWK, CryptoKey } from "jose";
import { generateKeyPair, exportJWK, importJWK } from "jose";
// panva/dpop v2 — one-shot DPoP proof creation (RFC 9449), incl. `ath` + nonce.
import * as DPoP from "dpop";
import { PREFERRED_SIGNING_ALG } from "../constant";

export type KeyPair = {
  privateKey: CryptoKey;
  publicKey: JWK;
};

/**
 * Creates a DPoP proof according to {@link https://www.rfc-editor.org/rfc/rfc9449 RFC 9449},
 * bound to the target URL and method, signed with the provided key — delegating
 * to panva's `dpop` package rather than hand-assembling the JWT.
 *
 * @param audience Target URL (becomes the normalised `htu` claim).
 * @param method HTTP method (becomes the `htm` claim).
 * @param dpopKey Key used to sign the proof.
 * @param accessToken When provided, the proof is bound to this access token via
 * the RFC 9449 `ath` claim (§4.2/§7). `dpop` computes
 * `base64url(SHA-256(ASCII(token)))` internally — no manual hashing needed. This
 * is REQUIRED whenever the proof accompanies an access token to a protected
 * resource, or a conforming resource server returns 401. (Replaces the manual
 * `ath` computation added in PR #4292.)
 * @param nonce Optional DPoP-Nonce echoed back from a `DPoP-Nonce` HTTP header /
 * `use_dpop_nonce` error. The full migration wires this through automatically via
 * the `oauth.DPoP()` handle; exposed here so callers can forward a server nonce.
 * @returns A compact JWT usable as the value of the `DPoP` header.
 */
export async function createDpopHeader(
  audience: string,
  method: string,
  dpopKey: KeyPair,
  accessToken?: string,
  nonce?: string,
): Promise<string> {
  // `dpop` needs a CryptoKeyPair; inrupt's KeyPair carries the public half as a
  // JWK, so re-import it. `importJWK` returns `CryptoKey | Uint8Array`; for the
  // asymmetric algs we use (ES256/RS256) it is always a `CryptoKey`.
  const publicKey = (await importJWK(
    dpopKey.publicKey,
    dpopKey.publicKey.alg ?? PREFERRED_SIGNING_ALG[0],
  )) as CryptoKey;

  // `DPoP.generateProof(keypair, htu, htm, nonce, accessToken)`:
  //  - normalises `htu` (strips query/fragment/userinfo) like the old normalizeHTU,
  //  - sets `htm`, a random `jti`, `iat`, and the `typ: "dpop+jwt"` + embedded
  //    `jwk` protected header,
  //  - derives the `ath` claim from `accessToken` when present.
  return DPoP.generateProof(
    { privateKey: dpopKey.privateKey, publicKey },
    audience,
    method.toUpperCase(),
    nonce,
    accessToken,
  );
}

export async function generateDpopKeyPair(): Promise<KeyPair> {
  // Unchanged shape (extractable so the public half can be serialised to a JWK
  // and persisted, and the refresh flow can re-import the SAME bound key).
  // TODO(migration): persist a non-extractable `oauth.generateKeyPair("ES256")`
  // CryptoKeyPair directly (IndexedDB stores CryptoKeys), dropping the JWK
  // round-trip. This is a storage-format change and is out of scope here — see
  // MIGRATION-oauth4webapi.md. Consistent with the same note in both
  // `oauthAdapter.ts` seams.
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
