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

/**
 * @hidden
 * @packageDocumentation
 */

import { injectable, inject } from "tsyringe";
import {
  IClient,
  IClientRegistrar,
  IIssuerConfigFetcher,
  IStorageUtility,
  loadOidcContextFromStorage,
  PREFERRED_SIGNING_ALG,
  DpopKeyPair,
} from "@inrupt/solid-client-authn-core";
import { Issuer, TokenSet } from "openid-client";
import { KeyObject } from "crypto";
import { configToIssuerMetadata } from "../IssuerConfigFetcher";
import { negotiateClientSigningAlg } from "../ClientRegistrar";

// Some identifiers are not in camelcase on purpose, as they are named using the
// official names from the OIDC/OAuth2 specifications.
/* eslint-disable camelcase */

/**
 * @hidden
 */
export interface ITokenRefresher {
  refresh(
    localUserId: string,
    refreshToken?: string,
    dpopKey?: DpopKeyPair,
    onNewRefreshToken?: (token: string) => unknown
  ): Promise<TokenSet & { access_token: string }>;
}

/**
 * @hidden
 */
@injectable()
export default class TokenRefresher implements ITokenRefresher {
  constructor(
    @inject("node:storageUtility") private storageUtility: IStorageUtility,
    @inject("node:issuerConfigFetcher")
    private issuerConfigFetcher: IIssuerConfigFetcher,
    @inject("node:clientRegistrar") private clientRegistrar: IClientRegistrar
  ) {}

  async refresh(
    sessionId: string,
    refreshToken?: string,
    dpopKey?: DpopKeyPair,
    onNewRefreshToken?: (newToken: string) => unknown
  ): Promise<TokenSet & { access_token: string }> {
    const oidcContext = await loadOidcContextFromStorage(
      sessionId,
      this.storageUtility,
      this.issuerConfigFetcher
    );

    const issuer = new Issuer(configToIssuerMetadata(oidcContext.issuerConfig));
    // This should also retrieve the client from storage
    const clientInfo: IClient = await this.clientRegistrar.getClient(
      { sessionId },
      oidcContext.issuerConfig
    );
    if (clientInfo.idTokenSignedResponseAlg === undefined) {
      clientInfo.idTokenSignedResponseAlg = negotiateClientSigningAlg(
        oidcContext.issuerConfig,
        PREFERRED_SIGNING_ALG
      );
    }
    const client = new issuer.Client({
      client_id: clientInfo.clientId,
      client_secret: clientInfo.clientSecret,
      id_token_signed_response_alg: clientInfo.idTokenSignedResponseAlg,
    });

    if (refreshToken === undefined) {
      // TODO: in a next PR, look up storage for a refresh token
      throw new Error(
        `Session [${sessionId}] has no refresh token to allow it to refresh its access token.`
      );
    }

    if (oidcContext.dpop && dpopKey === undefined) {
      throw new Error(
        `For session [${sessionId}], the key bound to the DPoP access token must be provided to refresh said access token.`
      );
    }

    const tokenSet = await client.refresh(refreshToken, {
      // openid-client does not support yet jose@3.x, and expects
      // type definitions that are no longer present. However, the JWK
      // type that we pass here is compatible with the API, hence the `any`
      // assertion.
      DPoP: dpopKey ? (dpopKey.privateKey as KeyObject) : undefined,
    });

    if (tokenSet.access_token === undefined) {
      // The error message is left minimal on purpose not to leak the tokens.
      throw new Error(
        `The Identity Provider [${issuer.metadata.issuer}] did not return an access token on refresh.`
      );
    }

    if (tokenSet.refresh_token !== undefined) {
      await this.storageUtility.setForUser(sessionId, {
        refreshToken: tokenSet.refresh_token,
      });
      if (typeof onNewRefreshToken === "function") {
        onNewRefreshToken(tokenSet.refresh_token);
      }
    }
    // The type assertion is fine, since we throw on undefined access_token
    return tokenSet as TokenSet & { access_token: string };
  }
}
