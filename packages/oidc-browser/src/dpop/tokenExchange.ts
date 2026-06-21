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
// Before: this file hand-rolled the authorization-code → token exchange:
//   - generated a DPoP proof via core's `createDpopHeader`,
//   - hand-built the `application/x-www-form-urlencoded` token POST,
//   - hand-parsed + hand-validated the response (7× `has*` guards,
//     `validateTokenEndpointResponse`).
//
// After: the exchange is delegated to oauth4webapi:
//   - `oauth.authorizationCodeGrantRequest(as, client, clientAuth,
//      callbackParams, redirectUri, codeVerifier, { DPoP })`
//   - `oauth.processAuthorizationCodeResponse(as, client, response, ...)`
//   with a per-flow `oauth.DPoP()` handle that auto-computes RFC 9449 `ath`
//   and transparently retries on `use_dpop_nonce`.
//
// The exported function name (`getTokens`), its argument order, and its return
// shape (`CodeExchangeResult`) are PRESERVED so `packages/browser`'s
// `AuthCodeRedirectHandler` keeps compiling unchanged.
//
// Phase 3: `TokenEndpointInput` gained OPTIONAL `authResponseUrl` + `expectedState`
// fields. When the redirect handler supplies them, `getTokens` runs
// `oauth.validateAuthResponse` (RFC 9207 `iss` + CSRF `state`) and uses its
// branded result as the callback params — closing Phase-2 risk #1 (the branded
// *cast*). Omitting them preserves the legacy code-only path.
//
// `validateTokenEndpointResponse` is kept as an exported helper (the bearer-vs-
// DPoP token_type assertion has no oauth4webapi equivalent and `refreshGrant`
// historically re-used it), but is no longer on the `getTokens` hot path.
// ---------------------------------------------------------------------------

import type {
  IClient,
  IIssuerConfig,
  KeyPair,
  TokenEndpointResponse,
} from "@inrupt/solid-client-authn-core";
import {
  getWebidFromTokenPayload,
  generateDpopKeyPair,
  OidcProviderError,
  InvalidResponseError,
} from "@inrupt/solid-client-authn-core";
import * as oauth from "oauth4webapi";
import {
  allowInsecureForIssuer,
  asAuthorizationServer,
  asOauthClient,
  clientAuthFor,
  dpopHandleFromKeyPair,
  mapOauthError,
} from "../oauth/oauthAdapter";

// Camelcase identifiers are required in the OAuth specification.
/* eslint-disable camelcase*/

function hasError(
  value: { error: string } | Record<string, unknown>,
): value is { error: string } {
  return value.error !== undefined && typeof value.error === "string";
}

function hasErrorDescription(
  value: { error_description: string } | Record<string, unknown>,
): value is { error_description: string } {
  return (
    value.error_description !== undefined &&
    typeof value.error_description === "string"
  );
}

function hasErrorUri(
  value: { error_uri: string } | Record<string, unknown>,
): value is { error_uri: string } {
  return value.error_uri !== undefined && typeof value.error_uri === "string";
}

function hasAccessToken(
  value: { access_token: string } | Record<string, unknown>,
): value is { access_token: string } {
  return (
    value.access_token !== undefined && typeof value.access_token === "string"
  );
}

function hasIdToken(
  value: { id_token: string } | Record<string, unknown>,
): value is { id_token: string } {
  return value.id_token !== undefined && typeof value.id_token === "string";
}

function hasTokenType(
  value: { token_type: string } | Record<string, unknown>,
): value is { token_type: string } {
  return value.token_type !== undefined && typeof value.token_type === "string";
}

function hasExpiresIn(
  value: { expires_in?: number } | Record<string, unknown>,
): value is { expires_in?: number } {
  return value.expires_in === undefined || typeof value.expires_in === "number";
}

export type CodeExchangeResult = TokenEndpointResponse & {
  // The idToken must not be undefined after the auth code exchange
  idToken: string;
  webId: string;
  clientId?: string;
  dpopKey?: KeyPair;
};

export type TokenEndpointInput = {
  grantType: string;
  redirectUrl: string;
  code: string;
  codeVerifier: string;
  /**
   * The full authorization-response URL the IdP redirected back to (query string
   * carrying `code`/`state`/`iss`/error params). When provided together with
   * {@link TokenEndpointInput.expectedState}, `getTokens` runs
   * `oauth.validateAuthResponse` to validate `state`/`iss`/error per RFC 9207
   * before exchanging the code — the spec-correct placement (Phase 3).
   *
   * Optional for backwards compatibility: when omitted, `getTokens` falls back to
   * the legacy behaviour of reconstructing the callback params from `code` alone
   * (the upstream redirect handler is then responsible for `state` validation).
   */
  authResponseUrl?: string;
  /**
   * The `state` value the client originally sent on the authorization request,
   * looked up from storage by the redirect handler. Required for
   * {@link oauth.validateAuthResponse} when {@link TokenEndpointInput.authResponseUrl}
   * is provided.
   */
  expectedState?: string;
};

function validatePreconditions(
  issuer: IIssuerConfig,
  data: TokenEndpointInput,
): void {
  if (
    data.grantType &&
    (!issuer.grantTypesSupported ||
      !issuer.grantTypesSupported.includes(data.grantType))
  ) {
    throw new Error(
      `The issuer [${issuer.issuer}] does not support the [${data.grantType}] grant`,
    );
  }
  if (!issuer.tokenEndpoint) {
    throw new Error(
      `This issuer [${issuer.issuer}] does not have a token endpoint`,
    );
  }
}

/**
 * Kept as an exported helper for the bearer-vs-DPoP `token_type` assertion,
 * which has no direct oauth4webapi equivalent. oauth4webapi's
 * `processAuthorizationCodeResponse` already rejects OAuth error bodies and
 * missing mandatory members, so this is no longer used on the `getTokens` hot
 * path; it is retained for backwards compatibility / explicit `token_type`
 * checks in `refreshGrant`.
 */
export function validateTokenEndpointResponse(
  tokenResponse: Record<string, unknown>,
  dpop: boolean,
): Record<string, unknown> & {
  access_token: string;
  id_token: string;
  expires_in?: number;
} {
  if (hasError(tokenResponse)) {
    throw new OidcProviderError(
      `Token endpoint returned error [${tokenResponse.error}]${
        hasErrorDescription(tokenResponse)
          ? `: ${tokenResponse.error_description}`
          : ""
      }${
        hasErrorUri(tokenResponse) ? ` (see ${tokenResponse.error_uri})` : ""
      }`,
      tokenResponse.error,
      hasErrorDescription(tokenResponse)
        ? tokenResponse.error_description
        : undefined,
    );
  }

  if (!hasAccessToken(tokenResponse)) {
    throw new InvalidResponseError(["access_token"]);
  }

  if (!hasIdToken(tokenResponse)) {
    throw new InvalidResponseError(["id_token"]);
  }

  if (!hasTokenType(tokenResponse)) {
    throw new InvalidResponseError(["token_type"]);
  }

  if (!hasExpiresIn(tokenResponse)) {
    throw new InvalidResponseError(["expires_in"]);
  }

  // TODO: Due to a bug in both the ESS ID broker AND NSS (what were the odds), a DPoP token is returned
  // with a token_type 'Bearer'. To work around this, this test is currently disabled.
  // https://github.com/solid/oidc-op/issues/26
  // Fixed, but unreleased for the ESS (current version: inrupt-oidc-server-0.5.2)
  // if (dpop && tokenResponse.token_type.toLowerCase() !== "dpop") {
  //   throw new Error(
  //     `Invalid token endpoint response: requested a [DPoP] token, but got a 'token_type' value of [${tokenResponse.token_type}].`
  //   );
  // }

  if (!dpop && tokenResponse.token_type.toLowerCase() !== "bearer") {
    throw new Error(
      `Invalid token endpoint response: requested a [Bearer] token, but got a 'token_type' value of [${tokenResponse.token_type}].`,
    );
  }
  return tokenResponse;
}

export async function getTokens(
  issuer: IIssuerConfig,
  client: IClient,
  data: TokenEndpointInput,
  dpop: boolean,
): Promise<CodeExchangeResult> {
  validatePreconditions(issuer, data);

  const as = asAuthorizationServer(issuer);
  const oauthClient = asOauthClient(client);
  const clientAuth = clientAuthFor(client);

  // The DPoP handle (and the bound key it carries) is created up-front so it can
  // be both threaded into the token grant AND returned for re-use by the refresh
  // path / resource requests — refresh MUST re-use this same bound key.
  let dpopKey: KeyPair | undefined;
  let dpopHandle: oauth.DPoPHandle | undefined;
  if (dpop) {
    // generateDpopKeyPair still yields inrupt's JWK-persisted KeyPair (so the
    // public half can be serialised into IndexedDB and reloaded after redirect).
    // TODO(migration): persist a non-extractable CryptoKeyPair instead and drop
    // the JWK round-trip in dpopHandleFromKeyPair.
    dpopKey = await generateDpopKeyPair();
    dpopHandle = await dpopHandleFromKeyPair(client, dpopKey);
  }

  // Phase 3 (auth-response validation placement): when the redirect handler
  // threads the full authorization-response URL + the expected `state`, validate
  // `state`/`iss`/error here with oauth4webapi's `validateAuthResponse` (RFC 9207
  // `iss` + CSRF `state`), and use its branded result as the callback params.
  // This removes the previous branded *cast* (Phase-2 risk #1): the params handed
  // to `authorizationCodeGrantRequest` are now genuinely validated rather than
  // trusted from upstream.
  //
  // Back-compat fallback: if no `authResponseUrl`/`expectedState` is supplied
  // (legacy callers), reconstruct a minimal callback-params object from the
  // stored `code` — the previous behaviour — and the upstream handler remains
  // responsible for the `state` check.
  let callbackParams: ReturnType<typeof oauth.validateAuthResponse>;
  if (
    data.authResponseUrl !== undefined &&
    data.expectedState !== undefined
  ) {
    try {
      callbackParams = oauth.validateAuthResponse(
        as,
        oauthClient,
        new URL(data.authResponseUrl),
        data.expectedState,
      );
    } catch (err) {
      return mapOauthError(err);
    }
  } else {
    const legacyParams = new URLSearchParams();
    legacyParams.set("code", data.code);
    // Cast: oauth4webapi brands the params returned from validateAuthResponse;
    // on this legacy path the redirect handler has already validated state/iss.
    callbackParams = legacyParams as unknown as ReturnType<
      typeof oauth.validateAuthResponse
    >;
  }

  let tokenResponse;
  try {
    tokenResponse = await oauth.authorizationCodeGrantRequest(
      as,
      oauthClient,
      clientAuth,
      callbackParams,
      data.redirectUrl,
      data.codeVerifier,
      {
        ...(dpopHandle ? { DPoP: dpopHandle } : {}),
        ...allowInsecureForIssuer(issuer.issuer),
      },
    );
  } catch (err) {
    return mapOauthError(err);
  }

  let processed: oauth.TokenEndpointResponse;
  try {
    // The DPoP handle auto-retries the request on a `use_dpop_nonce` challenge;
    // we still guard the legacy retry idiom here for older IdPs that surface the
    // nonce requirement at process time.
    processed = await oauth
      .processAuthorizationCodeResponse(as, oauthClient, tokenResponse, {
        // inrupt historically did not enforce the OIDC `nonce` (the redirect
        // handlers don't thread one); skip nonce verification to preserve parity.
        expectedNonce: oauth.expectNoNonce,
        requireIdToken: true,
      })
      .catch(async (err) => {
        if (oauth.isDPoPNonceError(err) && dpopHandle) {
          const retry = await oauth.authorizationCodeGrantRequest(
            as,
            oauthClient,
            clientAuth,
            callbackParams,
            data.redirectUrl,
            data.codeVerifier,
            {
              DPoP: dpopHandle,
              ...allowInsecureForIssuer(issuer.issuer),
            },
          );
          return oauth.processAuthorizationCodeResponse(
            as,
            oauthClient,
            retry,
            { expectedNonce: oauth.expectNoNonce, requireIdToken: true },
          );
        }
        throw err;
      });
  } catch (err) {
    return mapOauthError(err);
  }

  if (!hasAccessToken(processed)) {
    throw new InvalidResponseError(["access_token"]);
  }
  // requireIdToken: true guarantees id_token is present, but keep the explicit
  // guard so the `idToken: string` return contract is type-safe.
  if (typeof processed.id_token !== "string") {
    throw new InvalidResponseError(["id_token"]);
  }

  const { webId, clientId } = await getWebidFromTokenPayload(
    processed.id_token,
    issuer.jwksUri,
    issuer.issuer,
    client.clientId,
  );

  return {
    accessToken: processed.access_token,
    idToken: processed.id_token,
    refreshToken:
      typeof processed.refresh_token === "string"
        ? processed.refresh_token
        : undefined,
    webId,
    clientId,
    dpopKey,
    expiresIn:
      typeof processed.expires_in === "number"
        ? processed.expires_in
        : undefined,
  };
}
