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

import {
  IClient,
  IClientRegistrar,
  IIssuerConfigFetcher,
  IRedirectHandler,
  ISessionInfo,
  ISessionInfoManager,
  IStorageUtility,
  loadOidcContextFromStorage,
  saveSessionInfoToStorage,
  getSessionIdFromOauthState,
  getWebidFromTokenPayload,
  KeyPair,
  generateDpopKeyPair,
  RefreshOptions,
  ITokenRefresher,
  buildAuthenticatedFetch,
  EVENTS,
} from "@inrupt/solid-client-authn-core";
// eslint-disable-next-line no-shadow
import { URL } from "url";
import { Issuer } from "openid-client";
import { KeyObject } from "crypto";
import { fetch as globalFetch } from "cross-fetch";

import { EventEmitter } from "events";
import { configToIssuerMetadata } from "../IssuerConfigFetcher";

/**
 * @hidden
 * Token endpoint request: https://openid.net/specs/openid-connect-core-1_0.html#TokenEndpoint
 */
export class AuthCodeRedirectHandler implements IRedirectHandler {
  constructor(
    private storageUtility: IStorageUtility,
    private sessionInfoManager: ISessionInfoManager,
    private issuerConfigFetcher: IIssuerConfigFetcher,
    private clientRegistrar: IClientRegistrar,
    private tokenRefresher: ITokenRefresher
  ) {}

  async canHandle(redirectUrl: string): Promise<boolean> {
    try {
      const myUrl = new URL(redirectUrl);
      return (
        myUrl.searchParams.get("code") !== null &&
        myUrl.searchParams.get("state") !== null
      );
    } catch (e) {
      throw new Error(
        `[${redirectUrl}] is not a valid URL, and cannot be used as a redirect URL: ${e}`
      );
    }
  }

  async handle(
    inputRedirectUrl: string,
    eventEmitter?: EventEmitter
  ): Promise<ISessionInfo & { fetch: typeof globalFetch }> {
    if (!(await this.canHandle(inputRedirectUrl))) {
      throw new Error(
        `AuthCodeRedirectHandler cannot handle [${inputRedirectUrl}]: it is missing one of [code, state].`
      );
    }

    const url = new URL(inputRedirectUrl);
    // The type assertion is ok, because we checked in canHandle for the presence of a state
    const oauthState = url.searchParams.get("state") as string;
    url.searchParams.delete("code");
    url.searchParams.delete("state");

    const sessionId = await getSessionIdFromOauthState(
      this.storageUtility,
      oauthState
    );
    if (sessionId === undefined) {
      throw new Error(
        `No stored session is associated with the state [${oauthState}]`
      );
    }

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
    const client = new issuer.Client({
      client_id: clientInfo.clientId,
      client_secret: clientInfo.clientSecret,
      id_token_signed_response_alg: clientInfo.idTokenSignedResponseAlg,
    });

    const params = client.callbackParams(inputRedirectUrl);
    let dpopKey: KeyPair | undefined;

    if (oidcContext.dpop) {
      dpopKey = await generateDpopKeyPair();
    }
    const tokenSet = await client.callback(
      url.href,
      params,
      { code_verifier: oidcContext.codeVerifier, state: oauthState },
      // openid-client does not support yet jose@3.x, and expects
      // type definitions that are no longer present. However, the JWK
      // type that we pass here is compatible with the API.
      { DPoP: dpopKey?.privateKey as KeyObject }
    );

    if (
      tokenSet.access_token === undefined ||
      tokenSet.id_token === undefined
    ) {
      // The error message is left minimal on purpose not to leak the tokens.
      throw new Error(
        `The Identity Provider [${issuer.metadata.issuer}] did not return the expected tokens: missing at least one of 'access_token', 'id_token.`
      );
    }
    let refreshOptions: RefreshOptions | undefined;
    if (tokenSet.refresh_token !== undefined) {
      eventEmitter?.emit(EVENTS.NEW_REFRESH_TOKEN, tokenSet.refresh_token);
      refreshOptions = {
        refreshToken: tokenSet.refresh_token,
        sessionId,
        tokenRefresher: this.tokenRefresher,
      };
    }
    const authFetch = await buildAuthenticatedFetch(
      globalFetch,
      tokenSet.access_token,
      {
        dpopKey,
        refreshOptions,
        eventEmitter,
        expiresIn: tokenSet.expires_in,
      }
    );

    // tokenSet.claims() parses the ID token, validates its signature, and returns
    // its payload as a JSON object.
    const webid = await getWebidFromTokenPayload(
      tokenSet.id_token,
      // The JWKS URI is mandatory in the spec, so the non-null assertion is valid.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      issuer.metadata.jwks_uri!,
      issuer.metadata.issuer,
      client.metadata.client_id
    );

    await saveSessionInfoToStorage(
      this.storageUtility,
      sessionId,
      tokenSet.id_token,
      webid,
      "true",
      tokenSet.refresh_token,
      undefined,
      dpopKey
    );

    const sessionInfo = await this.sessionInfoManager.get(sessionId);
    if (!sessionInfo) {
      throw new Error(
        `Could not find any session information associated with SessionID [${sessionId}] in our storage.`
      );
    }

    return Object.assign(sessionInfo, {
      fetch: authFetch,
    });
  }
}
