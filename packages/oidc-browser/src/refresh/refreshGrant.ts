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
// Before: hand-built the `refresh_token` grant POST + DPoP proof header and
// hand-validated the response via `validateTokenEndpointResponse`.
//
// After: delegated to `oauth.refreshTokenGrantRequest` /
// `oauth.processRefreshTokenResponse` with a per-flow `oauth.DPoP()` handle
// built from the SAME bound DPoP key passed in (correctness-critical: a refresh
// must re-use the key the access token was originally bound to).
//
// The exported `refresh(refreshToken, issuer, client, dpopKey?)` signature and
// its `TokenEndpointResponse` return shape are PRESERVED so the `TokenRefresher`
// in `packages/browser` (and the `ITokenRefresher` contract in `core`) keep
// compiling unchanged.
// ---------------------------------------------------------------------------

import type {
  IClient,
  IIssuerConfig,
  KeyPair,
  TokenEndpointResponse,
} from "@inrupt/solid-client-authn-core";
import {
  getWebidFromTokenPayload,
  InvalidResponseError,
} from "@inrupt/solid-client-authn-core";
import * as oauth from "oauth4webapi";
import {
  asAuthorizationServer,
  asOauthClient,
  clientAuthFor,
  dpopHandleFromKeyPair,
  mapOauthError,
} from "../oauth/oauthAdapter";

// Identifiers in snake_case are mandated by the OAuth spec.
/* eslint-disable camelcase*/

export async function refresh(
  refreshToken: string,
  issuer: IIssuerConfig,
  client: IClient,
  dpopKey?: KeyPair,
): Promise<TokenEndpointResponse> {
  if (client.clientId === undefined) {
    throw new Error(
      "No client ID available when trying to refresh the access token.",
    );
  }

  const as = asAuthorizationServer(issuer);
  const oauthClient = asOauthClient(client);
  const clientAuth = clientAuthFor(client);

  // Re-use the SAME bound DPoP key: the refreshed access token must remain bound
  // to the key the original token was issued against. `oauth.DPoP()` adds the
  // `ath` claim + handles `use_dpop_nonce` retries automatically.
  const dpopHandle =
    dpopKey !== undefined
      ? await dpopHandleFromKeyPair(client, dpopKey)
      : undefined;

  let tokenResponse;
  try {
    tokenResponse = await oauth.refreshTokenGrantRequest(
      as,
      oauthClient,
      clientAuth,
      refreshToken,
      dpopHandle ? { DPoP: dpopHandle } : {},
    );
  } catch (err) {
    return mapOauthError(err);
  }

  let processed: oauth.TokenEndpointResponse;
  try {
    processed = await oauth
      .processRefreshTokenResponse(as, oauthClient, tokenResponse)
      .catch(async (err) => {
        // Explicit nonce-retry guard for IdPs that surface the DPoP nonce
        // requirement at process time rather than via the handle's auto-retry.
        if (oauth.isDPoPNonceError(err) && dpopHandle) {
          const retry = await oauth.refreshTokenGrantRequest(
            as,
            oauthClient,
            clientAuth,
            refreshToken,
            { DPoP: dpopHandle },
          );
          return oauth.processRefreshTokenResponse(as, oauthClient, retry);
        }
        throw err;
      });
  } catch (err) {
    return mapOauthError(err);
  }

  // The legacy implementation required an id_token on the refresh response
  // (it threw `InvalidResponseError(["id_token"])` otherwise, then resolved a
  // WebID from it). Preserve that contract.
  if (typeof processed.id_token !== "string") {
    throw new InvalidResponseError(["id_token"]);
  }

  const { webId } = await getWebidFromTokenPayload(
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
    dpopKey,
    expiresIn:
      typeof processed.expires_in === "number"
        ? processed.expires_in
        : undefined,
  };
}
