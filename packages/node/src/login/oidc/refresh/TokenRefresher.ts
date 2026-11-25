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
import type { TokenEndpointResponse as OidcTokenEndpointResponse } from "openid-client";
import { refreshTokenGrant } from "openid-client";
import type { EventEmitter } from "node:events";
import { negotiateClientSigningAlg } from "../ClientRegistrar";
import {
  buildClientConfiguration,
  buildDpopHandle,
  toOidcProviderError,
} from "../clientConfiguration";

const tokenSetToTokenEndpointResponse = async (
  tokenSet: OidcTokenEndpointResponse,
  issuerConfig: IIssuerConfig,
  clientInfo: IClient,
): Promise<TokenEndpointResponse> => {
  // openid-client rejects responses without an access token.
  if (tokenSet.id_token === undefined) {
    // The error message is left minimal on purpose not to leak the tokens.
    throw new Error(
      `The Identity Provider [${issuerConfig.issuer}] did not return the expected tokens on refresh: missing at least one of 'access_token', 'id_token'.`,
    );
  }

  if (typeof issuerConfig.jwksUri != "string") {
    throw new Error(
      `Cannot verify ID Token: Issuer Metadata is missing a JWKS URI (${JSON.stringify(issuerConfig)})`,
    );
  }

  // openid-client validates the ID Token claims, but not its signature, so
  // the signature is validated here.
  const { webId } = await getWebidFromTokenPayload(
    tokenSet.id_token,
    issuerConfig.jwksUri,
    issuerConfig.issuer,
    clientInfo.clientId,
  );

  return {
    accessToken: tokenSet.access_token,
    // openid-client rejects token types other than bearer and DPoP, and
    // normalizes them to lower case.
    tokenType: tokenSet.token_type === "dpop" ? "DPoP" : "Bearer",
    idToken: tokenSet.id_token,
    refreshToken: tokenSet.refresh_token,
    webId,
    // expiresAt is expressed in seconds since epoch.
    expiresAt:
      typeof tokenSet.expires_in === "number"
        ? Math.trunc(Date.now() / 1000) + tokenSet.expires_in
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
    const config = buildClientConfiguration(
      oidcContext.issuerConfig,
      clientInfo,
    );

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

    const tokenSet = await tokenSetToTokenEndpointResponse(
      await refreshTokenGrant(config, refreshToken, undefined, {
        DPoP: await buildDpopHandle(config, dpopKey),
      }).catch((e: unknown) => {
        throw toOidcProviderError(e);
      }),
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
      issuer: oidcContext.issuerConfig.issuer,
    });

    return tokenSet;
  }
}
