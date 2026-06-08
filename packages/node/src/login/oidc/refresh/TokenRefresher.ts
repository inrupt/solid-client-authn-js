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

/**
 * @hidden
 * @packageDocumentation
 */

// ---------------------------------------------------------------------------
// MIGRATION: oauth4webapi + dpop — Phase 4 (proposal/migrate-to-oauth4webapi)
// ---------------------------------------------------------------------------
// Before: `openid-client` `client.refresh(refreshToken, { DPoP })` with the
// `KeyObject`-bridged DPoP key (`asDPoPInput`).
//
// After: `oauth.refreshTokenGrantRequest` + `oauth.processRefreshTokenResponse`
// reusing the SAME bound DPoP key via a fresh `oauth.DPoP()` handle built from
// the persisted `KeyPair` (`dpopHandleFromStoredKeyPair` — JWK bridge, since the
// key was stored after the original login). Reusing the bound key on refresh is
// correctness-critical (RFC 9449).
//
// `tokenSetToTokenEndpointResponse` is retained but now consumes an
// `oauth.TokenEndpointResponse`; it keeps the legacy bearer/DPoP token_type
// assertion and ID-token validation via `getWebidFromTokenPayload`.
// ---------------------------------------------------------------------------
import type {
  IClient,
  IClientRegistrar,
  IIssuerConfig,
  IIssuerConfigFetcher,
  IStorageUtility,
  KeyPair,
  ITokenRefresher,
  TokenEndpointResponse,
} from "@inrupt/solid-client-authn-core";
import {
  loadOidcContextFromStorage,
  getWebidFromTokenPayload,
  PREFERRED_SIGNING_ALG,
  EVENTS,
} from "@inrupt/solid-client-authn-core";
import * as oauth from "oauth4webapi";
import type { EventEmitter } from "events";
import { negotiateClientSigningAlg } from "../ClientRegistrar";
import {
  asAuthorizationServer,
  asOauthClient,
  clientAuthFor,
  dpopHandleFromStoredKeyPair,
  mapOauthError,
} from "../oauth/oauthAdapter";

// Camelcase identifiers are required in the OIDC specification.
/* eslint-disable camelcase*/

const tokenSetToTokenEndpointResponse = async (
  tokenSet: oauth.TokenEndpointResponse,
  issuerConfig: IIssuerConfig,
  clientInfo: IClient,
): Promise<TokenEndpointResponse> => {
  if (tokenSet.access_token === undefined || tokenSet.id_token === undefined) {
    // The error message is left minimal on purpose not to leak the tokens.
    throw new Error(
      `The Identity Provider [${issuerConfig.issuer}] did not return the expected tokens on refresh: missing at least one of 'access_token', 'id_token'.`,
    );
  }

  // oauth4webapi normalises token_type to lowercase.
  if (
    tokenSet.token_type !== "bearer" &&
    tokenSet.token_type !== "dpop"
  ) {
    throw new Error(
      `The Identity Provider [${issuerConfig.issuer}] returned an unknown token type: [${tokenSet.token_type}].`,
    );
  }

  if (typeof issuerConfig.jwksUri != "string") {
    throw new Error(
      `Cannot verify ID Token: Issuer Metadata is missing a JWKS URI (${JSON.stringify(issuerConfig)})`,
    );
  }

  const { webId } = await getWebidFromTokenPayload(
    tokenSet.id_token,
    issuerConfig.jwksUri,
    issuerConfig.issuer,
    clientInfo.clientId,
  );

  return {
    accessToken: tokenSet.access_token,
    // Preserve the legacy capitalised token type for the public
    // TokenEndpointResponse contract.
    tokenType: tokenSet.token_type === "dpop" ? "DPoP" : "Bearer",
    idToken: tokenSet.id_token,
    refreshToken:
      typeof tokenSet.refresh_token === "string"
        ? tokenSet.refresh_token
        : undefined,
    webId,
    expiresAt:
      typeof tokenSet.expires_in === "number"
        ? Math.floor(Date.now() / 1000) + tokenSet.expires_in
        : undefined,
  };
};

/**
 * @hidden
 */
export default class TokenRefresher implements ITokenRefresher {
  constructor(
    private storageUtility: IStorageUtility,
    private issuerConfigFetcher: IIssuerConfigFetcher,
    private clientRegistrar: IClientRegistrar,
  ) {
    this.storageUtility = storageUtility;
    this.issuerConfigFetcher = issuerConfigFetcher;
    this.clientRegistrar = clientRegistrar;
  }

  async refresh(
    sessionId: string,
    refreshToken?: string,
    dpopKey?: KeyPair,
    eventEmitter?: EventEmitter,
  ): Promise<TokenEndpointResponse> {
    const oidcContext = await loadOidcContextFromStorage(
      sessionId,
      this.storageUtility,
      this.issuerConfigFetcher,
    );

    // This should also retrieve the client from storage
    const clientInfo: IClient = await this.clientRegistrar.getClient(
      { sessionId },
      oidcContext.issuerConfig,
    );
    if (clientInfo.idTokenSignedResponseAlg === undefined) {
      clientInfo.idTokenSignedResponseAlg = negotiateClientSigningAlg(
        oidcContext.issuerConfig,
        PREFERRED_SIGNING_ALG,
      );
    }

    if (refreshToken === undefined) {
      throw new Error(
        `Session [${sessionId}] has no refresh token to allow it to refresh its access token.`,
      );
    }

    if (oidcContext.dpop && dpopKey === undefined) {
      throw new Error(
        `For session [${sessionId}], the key bound to the DPoP access token must be provided to refresh said access token.`,
      );
    }

    const as = asAuthorizationServer(oidcContext.issuerConfig);
    const oauthClient = asOauthClient(clientInfo);
    const clientAuth = clientAuthFor(clientInfo);

    // Reuse the SAME bound DPoP key on refresh (RFC 9449). The key was persisted
    // as inrupt's JWK-shaped KeyPair, so it is bridged back to a CryptoKeyPair.
    const dpop =
      dpopKey !== undefined
        ? await dpopHandleFromStoredKeyPair(clientInfo, dpopKey)
        : undefined;

    let refreshed: oauth.TokenEndpointResponse;
    try {
      const grant = async (): Promise<oauth.TokenEndpointResponse> => {
        const tokenResponse = await oauth.refreshTokenGrantRequest(
          as,
          oauthClient,
          clientAuth,
          refreshToken,
          dpop ? { DPoP: dpop } : {},
        );
        return oauth.processRefreshTokenResponse(
          as,
          oauthClient,
          tokenResponse,
        );
      };
      refreshed = await grant().catch(async (err) => {
        if (oauth.isDPoPNonceError(err) && dpop) {
          return grant();
        }
        throw err;
      });
    } catch (err) {
      return mapOauthError(err);
    }

    const tokenSet = await tokenSetToTokenEndpointResponse(
      refreshed,
      oidcContext.issuerConfig,
      clientInfo,
    );

    if (tokenSet.refreshToken !== undefined) {
      eventEmitter?.emit(EVENTS.NEW_REFRESH_TOKEN, tokenSet.refreshToken);
      await this.storageUtility.setForUser(sessionId, {
        refreshToken: tokenSet.refreshToken,
      });
    }

    eventEmitter?.emit(EVENTS.NEW_TOKENS, {
      accessToken: tokenSet.accessToken,
      idToken: tokenSet.idToken,
      refreshToken: tokenSet.refreshToken,
      webId: tokenSet.webId,
      expiresAt: tokenSet.expiresAt,
      dpopKey,
      clientId: clientInfo.clientId,
      issuer: issuer.metadata.issuer,
    });

    return tokenSet;
  }
}
