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
// MIGRATION: oauth4webapi + dpop — Phase 2 (proposal/migrate-to-oauth4webapi)
// ---------------------------------------------------------------------------
// Shared adapter helpers that bridge inrupt's internal types (`IIssuerConfig`,
// `IClient`, the JWK-persisted `KeyPair`) to the plain config records that
// oauth4webapi consumes (`AuthorizationServer`, `Client`, a `CryptoKeyPair`).
//
// oauth4webapi is *stateless and functional* — there is no client object to
// instantiate. It works against two plain records:
//   - `AuthorizationServer` — the discovered issuer metadata.
//   - `Client`              — `{ client_id, token_endpoint_auth_method?, ... }`.
// and DPoP is a per-flow handle: `oauth.DPoP(client, keyPair)`.
//
// This module is the seam where the legacy `IIssuerConfig` (already discovered
// elsewhere in the codebase, Phase 3 will move discovery to
// `oauth.discoveryRequest`) is mapped onto the `AuthorizationServer` shape.
// ---------------------------------------------------------------------------

import type { JWK, CryptoKey } from "jose";
import { importJWK } from "jose";
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
 * Map inrupt's already-discovered {@link IIssuerConfig} onto the
 * oauth4webapi {@link oauth.AuthorizationServer} record.
 *
 * NB: discovery itself is still handled upstream (the `IssuerConfigFetcher`);
 * Phase 3 of the migration replaces that with `oauth.discoveryRequest` /
 * `oauth.processDiscoveryResponse`, at which point this mapping disappears and
 * the discovered `AuthorizationServer` is threaded directly.
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
    response_modes_supported: issuer.responseModesSupported,
    grant_types_supported: issuer.grantTypesSupported,
    subject_types_supported: issuer.subjectTypesSupported,
    id_token_signing_alg_values_supported:
      issuer.idTokenSigningAlgValuesSupported,
    token_endpoint_auth_methods_supported:
      issuer.tokenEndpointAuthMethodsSupported,
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
    // The legacy code path assumes client_secret_basic (see getTokens/refresh).
    oauthClient.client_secret = client.clientSecret;
    oauthClient.token_endpoint_auth_method = "client_secret_basic";
  } else {
    // Solid-OIDC public client / Client ID Document → no client auth.
    oauthClient.token_endpoint_auth_method = "none";
  }
  return oauthClient;
}

/**
 * Select the oauth4webapi {@link oauth.ClientAuth} helper matching the client.
 *
 * Mirrors the legacy behaviour: a client secret means `client_secret_basic`
 * (Basic auth header), otherwise no client authentication (`None`) — which for
 * a public/Solid-OIDC client puts `client_id` in the request body.
 *
 * NOTE (CI-validate): `@solid/reactive-authentication` ships a *non*-URL-encoding
 * `ClientSecretBasic` variant for ESS (PodSpaces), because ESS rejects the
 * spec-conformant URL-encoded form. The legacy inrupt code base64's
 * `clientId:clientSecret` directly (also not URL-encoded). We use the
 * spec-conformant `oauth.ClientSecretBasic` here; if conformance against ESS
 * regresses, port the `NoUrlEncodeClientSecretBasic` workaround from the
 * reference. See MIGRATION-oauth4webapi.md Open Question #2.
 */
export function clientAuthFor(client: IClient): oauth.ClientAuth {
  if (client.clientSecret !== undefined) {
    return oauth.ClientSecretBasic(client.clientSecret);
  }
  return oauth.None();
}

/**
 * Whether an issuer/endpoint URL is an HTTP(S) *localhost* origin.
 *
 * oauth4webapi v3 rejects plain-`http://` requests by default. The legacy
 * hand-rolled browser `fetch` made requests to whatever URL it was given, so it
 * implicitly allowed `http://localhost`-style issuers used in local development
 * and the conformance harness. {@link allowInsecureForIssuer} re-enables that for
 * loopback hosts ONLY, so real IdPs keep the spec-mandated HTTPS enforcement.
 * Mirror of the node adapter's helper.
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
 * (preserving the legacy http-on-localhost behaviour), an empty object otherwise.
 * Spread into the options bag of grant / DCR / discovery calls.
 */
export function allowInsecureForIssuer(
  issuer: string,
): Record<symbol, boolean> {
  return isHttpLocalhost(issuer)
    ? { [oauth.allowInsecureRequests]: true }
    : {};
}

/**
 * Build a per-flow DPoP handle from inrupt's JWK-persisted {@link KeyPair}.
 *
 * `oauth.DPoP()` (and the `dpop` package underneath) require a `CryptoKeyPair`
 * whose public half is a `CryptoKey`, but inrupt persists `KeyPair.publicKey`
 * as a serialisable `JWK` (IndexedDB / session storage). We re-import the JWK to
 * a `CryptoKey` — exactly the Phase 1 bridge in `core/.../dpopUtils.ts`.
 *
 * The DPoP handle transparently manages the RFC 9449 `ath` claim and the
 * `use_dpop_nonce` retry, so no manual nonce handling is required at the call
 * sites.
 *
 * TODO(migration): persist a non-extractable `oauth.generateKeyPair("ES256")`
 * `CryptoKeyPair` end-to-end (Phase 3/4) so this JWK round-trip disappears.
 */
export async function dpopHandleFromKeyPair(
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
 * Translate an oauth4webapi error into inrupt's existing error classes, so the
 * `Session` layer and its consumers keep seeing the same error types
 * ({@link OidcProviderError} / {@link InvalidResponseError}) as before.
 *
 * - `ResponseBodyError` / `AuthorizationResponseError` → carry `error` +
 *   `error_description`, mapping to {@link OidcProviderError}.
 * - `WWWAuthenticateChallengeError` → also surfaced as {@link OidcProviderError}
 *   (the legacy code returned a generic provider error here).
 * - `OperationProcessingError` (missing/invalid fields) → {@link InvalidResponseError}.
 *
 * Anything unrecognised is rethrown unchanged.
 */
export function mapOauthError(err: unknown): never {
  // OAuth 2.0 protocol-style error JSON body (token/registration endpoints) and
  // authorization redirect errors both expose `.error` / `.error_description`.
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
    // A processing failure generally means the response was malformed or
    // missing mandatory members; surface it as an invalid-response error.
    throw new InvalidResponseError([err.message]);
  }
  throw err as Error;
}
