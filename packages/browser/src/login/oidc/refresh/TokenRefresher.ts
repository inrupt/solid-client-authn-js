/*
 * Copyright 2022 Inrupt Inc.
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

import {
  IClient,
  IIssuerConfigFetcher,
  IStorageUtility,
  loadOidcContextFromStorage,
  KeyPair,
  ITokenRefresher,
  TokenEndpointResponse,
  EVENTS,
  ClientManager,
} from "@inrupt/solid-client-authn-core";
import { refresh } from "@inrupt/oidc-client-ext";
import { EventEmitter } from "events";

// Some identifiers are not in camelcase on purpose, as they are named using the
// official names from the OIDC/OAuth2 specifications.
/* eslint-disable camelcase */

/**
 * @hidden
 */
export default class TokenRefresher implements ITokenRefresher {
  constructor(
    private storageUtility: IStorageUtility,
    private issuerConfigFetcher: IIssuerConfigFetcher,
    private clientManager: ClientManager
  ) {}

  async refresh(
    sessionId: string,
    refreshToken?: string,
    dpopKey?: KeyPair,
    eventEmitter?: EventEmitter
  ): Promise<TokenEndpointResponse> {
    const oidcContext = await loadOidcContextFromStorage(
      sessionId,
      this.storageUtility,
      this.issuerConfigFetcher
    );

    const issuer = oidcContext.issuerConfig.issuer;
    const clientInfo = await this.clientManager.get(issuer);

    if (clientInfo === null) {
      throw new Error(`The client for ${issuer} was not found in storage`);
    }

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

    const tokenSet = await refresh(
      refreshToken,
      oidcContext.issuerConfig,
      clientInfo,
      dpopKey
    );

    if (tokenSet.refreshToken !== undefined) {
      eventEmitter?.emit(EVENTS.NEW_REFRESH_TOKEN, tokenSet.refreshToken);
      await this.storageUtility.setForUser(sessionId, {
        refreshToken: tokenSet.refreshToken,
      });
    }
    return tokenSet;
  }
}
