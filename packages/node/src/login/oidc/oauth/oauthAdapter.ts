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
// MIGRATION: oauth4webapi + dpop — Phase 4 (proposal/migrate-to-oauth4webapi)
// ---------------------------------------------------------------------------
// Node-side mirror of `packages/oidc-browser/src/oauth/oauthAdapter.ts` (Phase
// 2). Shared helpers that bridge inrupt's internal types (`IIssuerConfig`,
// `IClient`, the JWK-persisted `KeyPair`) to the plain config records that
// oauth4webapi consumes (`AuthorizationServer`, `Client`, a `CryptoKeyPair`),
// plus the ClientAuth selection and oauth4webapi→inrupt error mapping.
//
// oauth4webapi is *stateless and functional* — there is no client object to
// instantiate, only two plain records (`AuthorizationServer`, `Client`) and a
// per-flow DPoP handle `oauth.DPoP(client, keyPair)`.
//
// Difference from the browser seam: in node we mint *fresh* DPoP keys with
// `oauth.generateKeyPair` (Node 22+ Web Crypto; see the package `engines`),
// producing a `CryptoKeyPair` directly. The login/auth-code/client-credentials
// paths build the DPoP handle straight from that pair. The *refresh* path must
// reuse a DPoP key persisted into storage as the JWK-shaped `KeyPair`, so it
// bridges via `dpopHandleFromStoredKeyPair`.
//
// NB: unlike the reactive-authentication reference, node generates the key as
// EXTRACTABLE — inrupt persists the private key (jose `exportJWK`) for the
// refresh flow, which requires extractability. See `generateDpopCryptoKeyPair`.
// ---------------------------------------------------------------------------

import type { JWK, CryptoKey } from "jose";
import { importJWK, exportJWK } from "jose";
import type {
  IClient,
  IIssuerConfig,
  KeyPair,
} from "@inrupt/solid-client-authn-core";
import {
  OidcProviderError,
  InvalidResponseError,
  PREFERRED_SIGNING_ALG,
} from "@inrupt/solid-client-authn-core";
import * as oauth from "oauth4webapi";

// Camelcase identifiers are required in the OAuth/OIDC specifications.
/* eslint-disable camelcase */

/**
 * Map inrupt's already-discovered {@link IIssuerConfig} onto the oauth4webapi
 * {@link oauth.AuthorizationServer} record.
 *
 * NB: with Phase 4, discovery itself is performed via `oauth.discoveryRequest`
 * in {@link IssuerConfigFetcher}, but the discovered config is still persisted
 * and re-loaded as an `IIssuerConfig`, so this mapping is the seam used by the
 * grant call sites (auth-code, client-credentials, refresh).
 */
export function asAuthorizationServer(
  issuer: IIssuerConfig,
): oauth.AuthorizationServer {
  return {
    issuer: issuer.issuer,
    authorization_endpoint: issuer.authorizationEndpoint,
    token_endpoint: issuer.tokenEndpoint,
    jwks_uri: issuer.jwksUri,
    registration_endpoint: issuer.registrationEndpoint,
    userinfo_endpoint: issuer.userinfoEndpoint,
    end_session_endpoint: issuer.endSessionEndpoint,
    scopes_supported: issuer.scopesSupported,
    response_types_supported: issuer.responseTypesSupported,
    grant_types_supported: issuer.grantTypesSupported,
    subject_types_supported: issuer.subjectTypesSupported,
    id_token_signing_alg_values_supported:
      issuer.idTokenSigningAlgValuesSupported,
    token_endpoint_auth_methods_supported:
      issuer.tokenEndpointAuthMethodsSupported,
    token_endpoint_auth_signing_alg_values_supported:
      issuer.tokenEndpointAuthSigningAlgValuesSupported,
    request_object_signing_alg_values_supported:
      issuer.requestObjectSigningAlgValuesSupported,
    claims_supported: issuer.claimsSupported,
  };
}

/**
 * Map inrupt's {@link IClient} onto the oauth4webapi {@link oauth.Client} record.
 *
 * The auth method is carried so {@link clientAuthFor} can pick the matching
 * `oauth.ClientAuth` helper.
 */
export function asOauthClient(client: IClient): oauth.Client {
  const oauthClient: oauth.Client = {
    client_id: client.clientId,
  };
  if (client.clientSecret !== undefined) {
    // The legacy code path assumes client_secret_basic (see callback/refresh/
    // client-credentials).
    oauthClient.client_secret = client.clientSecret;
    oauthClient.token_endpoint_auth_method = "client_secret_basic";
  } else {
    // Solid-OIDC public client / Client ID Document → no client auth.
    oauthClient.token_endpoint_auth_method = "none";
  }
  return oauthClient;
}

/**
 * A variation of oauth4webapi's `ClientSecretBasic` that does NOT URL-encode the
 * client id/secret before base64 encoding them.
 *
 * @remarks ESS (PodSpaces / `login.inrupt.com`) rejects the spec-conformant
 * URL-encoded Basic credentials; the legacy inrupt code base64'd
 * `clientId:clientSecret` directly (also un-encoded), and
 * `@solid/reactive-authentication` ships the same workaround. The
 * conformance harness (which logs in via client-credentials against ESS-style
 * IdPs / Keycloak) depends on this behaviour.
 *
 * @see https://github.com/panva/oauth4webapi spec-conformant `ClientSecretBasic`
 * @see RFC 6749 §2.3.1
 */
function noUrlEncodeClientSecretBasic(clientSecret: string): oauth.ClientAuth {
  return (_as, client, _body, headers) => {
    headers.set(
      "authorization",
      `Basic ${btoa(`${client.client_id}:${clientSecret}`)}`,
    );
  };
}

/**
 * Select the oauth4webapi {@link oauth.ClientAuth} helper matching the client.
 *
 * Mirrors the legacy behaviour: a client secret means `client_secret_basic`
 * (Basic auth header, NOT URL-encoded to match the legacy inrupt code +
 * ESS expectations), otherwise no client authentication (`None`) — which for a
 * public/Solid-OIDC client puts `client_id` in the request body.
 *
 * NOTE (CI-validate): the legacy inrupt node stack used `openid-client`'s
 * `client_secret_basic`, which base64s `clientId:clientSecret` WITHOUT
 * URL-encoding. The spec-conformant `oauth.ClientSecretBasic` URL-encodes, which
 * ESS rejects (see Phase 2 Open Question #2). We therefore default to the
 * non-encoding variant to preserve conformance/ESS behaviour. If a future IdP
 * requires the spec form, fingerprint the issuer here and fall back to
 * `oauth.ClientSecretBasic`.
 */
export function clientAuthFor(client: IClient): oauth.ClientAuth {
  if (client.clientSecret !== undefined) {
    return noUrlEncodeClientSecretBasic(client.clientSecret);
  }
  return oauth.None();
}

/**
 * Whether an issuer/endpoint URL is an HTTP(S) *localhost* origin.
 *
 * oauth4webapi v3 rejects plain-`http://` requests by default (it requires HTTPS
 * for every protocol endpoint). The legacy stack (`openid-client` v5 in node, the
 * hand-rolled `fetch` in the browser) made requests to whatever URL it was given,
 * so it implicitly *allowed* `http://localhost`-style issuers used in local
 * development and the conformance harness (local CSS / Keycloak over http).
 *
 * To preserve exactly that behaviour — and ONLY that — call sites pass
 * {@link allowInsecureForIssuer} when building the oauth4webapi options bag, which
 * flips `oauth.allowInsecureRequests` on solely for loopback hosts. Non-localhost
 * `http://` issuers stay rejected (a security improvement, not a regression: the
 * spec mandates HTTPS for real IdPs and Solid-OIDC requires it).
 */
export function isHttpLocalhost(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    const isLoopback =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]" ||
      hostname === "::1" ||
      hostname.endsWith(".localhost");
    return (protocol === "http:" || protocol === "https:") && isLoopback;
  } catch {
    return false;
  }
}

/**
 * Build the oauth4webapi "allow insecure requests" option fragment for an issuer.
 *
 * Returns `{ [oauth.allowInsecureRequests]: true }` for http(s)-localhost issuers
 * (preserving the legacy http-on-localhost behaviour), and an empty object
 * otherwise (so real IdPs keep the spec-mandated HTTPS enforcement). Spread into
 * the options bag of `discoveryRequest` / grant / DCR calls.
 */
export function allowInsecureForIssuer(
  issuer: string,
): Record<symbol, boolean> {
  return isHttpLocalhost(issuer)
    ? { [oauth.allowInsecureRequests]: true }
    : {};
}

/**
 * Generate a fresh DPoP {@link CryptoKeyPair} for a node login flow.
 *
 * IMPORTANT (storage/refresh contract): the key is generated **extractable**.
 * inrupt persists the DPoP key into storage so the refresh grant can reuse the
 * *same* bound key (`saveSessionInfoToStorage` calls jose `exportJWK` on the
 * PRIVATE key — which throws for a non-extractable key). The
 * `@solid/reactive-authentication` reference uses `extractable: false` because
 * it is popup-based and never persists/refreshes; node cannot, so it must keep
 * the key extractable to preserve the existing refresh behaviour.
 *
 * TODO(migration): persist a non-extractable CryptoKeyPair directly (store the
 * `CryptoKey`s rather than JWKs) end-to-end, which would let this use
 * `{ extractable: false }`. That is a storage-format change and is out of scope
 * for Phase 4 — see MIGRATION-oauth4webapi.md.
 */
export function generateDpopCryptoKeyPair(): Promise<CryptoKeyPair> {
  return oauth.generateKeyPair(PREFERRED_SIGNING_ALG[0], {
    extractable: true,
  }) as unknown as Promise<CryptoKeyPair>;
}

/**
 * Build a per-flow DPoP handle from a freshly-minted {@link CryptoKeyPair}.
 */
export function dpopHandle(
  client: IClient,
  keyPair: CryptoKeyPair,
): oauth.DPoPHandle {
  return oauth.DPoP(asOauthClient(client), keyPair);
}

/**
 * Build a per-flow DPoP handle from inrupt's JWK-persisted {@link KeyPair}.
 *
 * Used ONLY on the refresh path, where the DPoP key bound to the original access
 * token has been persisted to storage as `{ privateKey: CryptoKey, publicKey:
 * JWK }` and reloaded; the *same* bound key MUST be reused on refresh
 * (correctness-critical, RFC 9449). `oauth.DPoP()` needs a `CryptoKeyPair`, so
 * we re-import the public JWK to a `CryptoKey` (jose `importJWK`), exactly as the
 * Phase 1/2 browser bridge does.
 *
 * TODO(migration): persist a non-extractable `oauth.generateKeyPair("ES256")`
 * `CryptoKeyPair` end-to-end so this JWK round-trip disappears. This is a
 * storage-format change (the public half would no longer be a serialisable JWK)
 * and is deferred — see MIGRATION-oauth4webapi.md.
 */
export async function dpopHandleFromStoredKeyPair(
  client: IClient,
  dpopKey: KeyPair,
): Promise<oauth.DPoPHandle> {
  const publicKey = (await importJWK(
    dpopKey.publicKey as JWK,
    (dpopKey.publicKey as JWK).alg ?? PREFERRED_SIGNING_ALG[0],
  )) as CryptoKey;
  const keyPair: CryptoKeyPair = {
    privateKey: dpopKey.privateKey as unknown as CryptoKey,
    publicKey,
  };
  return oauth.DPoP(asOauthClient(client), keyPair);
}

/**
 * Convert a fresh oauth4webapi {@link CryptoKeyPair} into inrupt's persisted
 * {@link KeyPair} shape (`{ privateKey: CryptoKey, publicKey: JWK }`), so the
 * existing storage / `buildAuthenticatedFetch` contract is preserved unchanged.
 *
 * `buildAuthenticatedFetch` and `saveSessionInfoToStorage` both expect the
 * legacy `KeyPair` (private `CryptoKey` + public `JWK`). To keep that contract,
 * we export the public half of the generated key to a JWK (stamped with the
 * preferred alg, matching the legacy `generateDpopKeyPair` behaviour).
 *
 * NOTE: the generated private key is non-extractable; only the PUBLIC half is
 * exported to a JWK, so this does not weaken the key.
 */
export async function keyPairFromCryptoKeyPair(
  cryptoKeyPair: CryptoKeyPair,
): Promise<KeyPair> {
  // Exporting a public key to a JWK is always permitted regardless of the key's
  // extractability. We reuse jose's `exportJWK` (already a dependency) for
  // parity with core's `generateDpopKeyPair`.
  const publicKey = await exportJWK(
    cryptoKeyPair.publicKey as unknown as CryptoKey,
  );
  // The alg property isn't set by exportJWK, so set it manually (matches the
  // legacy `generateDpopKeyPair` behaviour).
  [publicKey.alg] = PREFERRED_SIGNING_ALG;
  return {
    privateKey: cryptoKeyPair.privateKey as unknown as CryptoKey,
    publicKey,
  };
}

/**
 * Translate an oauth4webapi error into inrupt's existing error classes, so the
 * `Session` layer and its consumers keep seeing the same error types
 * ({@link OidcProviderError} / {@link InvalidResponseError}) as before.
 *
 * Mirrors the Phase 2 browser mapping exactly.
 */
export function mapOauthError(err: unknown): never {
  if (
    err instanceof oauth.ResponseBodyError ||
    err instanceof oauth.AuthorizationResponseError
  ) {
    throw new OidcProviderError(
      `Token endpoint returned error [${err.error}]${
        err.error_description ? `: ${err.error_description}` : ""
      }`,
      err.error,
      err.error_description ?? undefined,
    );
  }
  if (err instanceof oauth.WWWAuthenticateChallengeError) {
    const [challenge] = err.cause;
    const error = challenge?.parameters?.error ?? "invalid_token";
    const description = challenge?.parameters?.error_description;
    throw new OidcProviderError(
      `Token endpoint returned a WWW-Authenticate challenge [${error}]${
        description ? `: ${description}` : ""
      }`,
      error,
      description,
    );
  }
  if (err instanceof oauth.OperationProcessingError) {
    throw new InvalidResponseError([err.message]);
  }
  throw err as Error;
}
