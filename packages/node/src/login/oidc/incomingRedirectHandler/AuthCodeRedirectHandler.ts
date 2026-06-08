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
  IIssuerConfigFetcher,
  IIncomingRedirectHandler,
  ISessionInfoManager,
  IStorageUtility,
  KeyPair,
  RefreshOptions,
  ITokenRefresher,
  IncomingRedirectResult,
} from "@inrupt/solid-client-authn-core";
import {
  loadOidcContextFromStorage,
  saveSessionInfoToStorage,
  getSessionIdFromOauthState,
  getWebidFromTokenPayload,
  buildAuthenticatedFetch,
  EVENTS,
  maybeBuildRpInitiatedLogout,
  removeOpenIdParams,
} from "@inrupt/solid-client-authn-core";

import { URL } from "url";
import * as oauth from "oauth4webapi";
import type { EventEmitter } from "events";
import {
  asAuthorizationServer,
  asOauthClient,
  clientAuthFor,
  dpopHandle,
  generateDpopCryptoKeyPair,
  keyPairFromCryptoKeyPair,
  mapOauthError,
} from "../oauth/oauthAdapter";

// Camelcase identifiers are required in the OIDC specification.
/* eslint-disable camelcase*/

/**
 * @hidden
 * Token endpoint request: https://openid.net/specs/openid-connect-core-1_0.html#TokenEndpoint
 */
export class AuthCodeRedirectHandler implements IIncomingRedirectHandler {
  constructor(
    private storageUtility: IStorageUtility,
    private sessionInfoManager: ISessionInfoManager,
    private issuerConfigFetcher: IIssuerConfigFetcher,
    private clientRegistrar: IClientRegistrar,
    private tokenRefresher: ITokenRefresher,
  ) {
    this.storageUtility = storageUtility;
    this.sessionInfoManager = sessionInfoManager;
    this.issuerConfigFetcher = issuerConfigFetcher;
    this.clientRegistrar = clientRegistrar;
    this.tokenRefresher = tokenRefresher;
  }

  async canHandle(redirectUrl: string): Promise<boolean> {
    try {
      const myUrl = new URL(redirectUrl);
      return (
        myUrl.searchParams.get("code") !== null &&
        myUrl.searchParams.get("state") !== null
      );
    } catch (e) {
      throw new Error(
        `[${redirectUrl}] is not a valid URL, and cannot be used as a redirect URL: ${e}`,
      );
    }
  }

  async handle(
    inputRedirectUrl: string,
    eventEmitter?: EventEmitter,
  ): Promise<IncomingRedirectResult> {
    if (!(await this.canHandle(inputRedirectUrl))) {
      throw new Error(
        `AuthCodeRedirectHandler cannot handle [${inputRedirectUrl}]: it is missing one of [code, state].`,
      );
    }

    const url = new URL(inputRedirectUrl);
    // The type assertion is ok, because we checked in canHandle for the presence of a state
    const oauthState = url.searchParams.get("state") as string;

    const sessionId = await getSessionIdFromOauthState(
      this.storageUtility,
      oauthState,
    );
    if (sessionId === undefined) {
      throw new Error(
        `No stored session is associated with the state [${oauthState}]`,
      );
    }

    const oidcContext = await loadOidcContextFromStorage(
      sessionId,
      this.storageUtility,
      this.issuerConfigFetcher,
    );

    // The JWKS URI is mandatory in the spec — needed to validate the ID token.
    if (typeof oidcContext.issuerConfig.jwksUri !== "string") {
      throw new Error(
        `JWKS URI is missing from issuer configuration, cannot validate tokens. Expected jwks_uri in ${JSON.stringify(oidcContext.issuerConfig)}`,
      );
    }
    // This should also retrieve the client from storage
    const clientInfo: IClient = await this.clientRegistrar.getClient(
      { sessionId },
      oidcContext.issuerConfig,
    );

    const as = asAuthorizationServer(oidcContext.issuerConfig);
    const oauthClient = asOauthClient(clientInfo);
    const clientAuth = clientAuthFor(clientInfo);

    // Mint a fresh DPoP key (node Web Crypto) and a per-flow DPoP handle (RFC
    // 9449 `ath` + `use_dpop_nonce` retry are library-managed). The KeyPair is
    // converted to inrupt's persisted shape so storage + buildAuthenticatedFetch
    // keep their existing contract.
    let dpopKey: KeyPair | undefined;
    let dpop: oauth.DPoPHandle | undefined;
    if (oidcContext.dpop) {
      // Extractable: the key is persisted to storage so the refresh grant can
      // reuse it (see generateDpopCryptoKeyPair). TODO(migration): non-extractable.
      const cryptoKeyPair = await generateDpopCryptoKeyPair();
      dpopKey = await keyPairFromCryptoKeyPair(cryptoKeyPair);
      dpop = dpopHandle(clientInfo, cryptoKeyPair);
    }

    // Validate the authorization redirect (state/iss/error) against the request,
    // then exchange the code. `validateAuthResponse` returns branded params for
    // `authorizationCodeGrantRequest`.
    let processed: oauth.TokenEndpointResponse;
    try {
      const callbackParams = oauth.validateAuthResponse(
        as,
        oauthClient,
        new URL(inputRedirectUrl),
        oauthState,
      );

      const exchange = async (): Promise<oauth.TokenEndpointResponse> => {
        const tokenResponse = await oauth.authorizationCodeGrantRequest(
          as,
          oauthClient,
          clientAuth,
          callbackParams,
          removeOpenIdParams(inputRedirectUrl).href,
          oidcContext.codeVerifier as string,
          dpop ? { DPoP: dpop } : {},
        );
        // inrupt's redirect flow does not thread an OIDC `nonce`, so disable
        // id-token nonce verification to preserve parity. The `id_token`
        // presence is asserted below to keep the legacy hard requirement.
        return oauth.processAuthorizationCodeResponse(
          as,
          oauthClient,
          tokenResponse,
          { expectedNonce: oauth.expectNoNonce, requireIdToken: true },
        );
      };

      processed = await exchange().catch(async (err) => {
        // The DPoP handle auto-retries on `use_dpop_nonce`; guard the idiom here
        // too for IdPs that surface the nonce requirement at process time.
        if (oauth.isDPoPNonceError(err) && dpop) {
          return exchange();
        }
        throw err;
      });
    } catch (err) {
      return mapOauthError(err);
    }

    if (
      typeof processed.access_token !== "string" ||
      typeof processed.id_token !== "string"
    ) {
      // The error message is left minimal on purpose not to leak the tokens.
      throw new Error(
        `The Identity Provider [${oidcContext.issuerConfig.issuer}] did not return the expected tokens: missing at least one of 'access_token', 'id_token'.`,
      );
    }
    const accessToken = processed.access_token;
    const idToken = processed.id_token;
    const refreshToken =
      typeof processed.refresh_token === "string"
        ? processed.refresh_token
        : undefined;
    const expiresIn =
      typeof processed.expires_in === "number"
        ? processed.expires_in
        : undefined;

    let refreshOptions: RefreshOptions | undefined;
    if (refreshToken !== undefined) {
      eventEmitter?.emit(EVENTS.NEW_REFRESH_TOKEN, refreshToken);
      refreshOptions = {
        refreshToken,
        sessionId,
        tokenRefresher: this.tokenRefresher,
      };
    }
    const authFetch = buildAuthenticatedFetch(accessToken, {
      dpopKey,
      refreshOptions: oidcContext.keepAlive ? refreshOptions : undefined,
      eventEmitter,
      expiresIn,
    });

    // getWebidFromTokenPayload validates the ID token's signature, issuer and
    // audience (via jose), then extracts the WebID / azp client id. This is the
    // ID-token validation layer inrupt keeps after the migration.
    const { webId, clientId } = await getWebidFromTokenPayload(
      idToken,
      oidcContext.issuerConfig.jwksUri,
      oidcContext.issuerConfig.issuer,
      clientInfo.clientId,
    );

    const expiresAt =
      expiresIn !== undefined ? Math.floor(Date.now() / 1000) + expiresIn : undefined;
    eventEmitter?.emit(EVENTS.NEW_TOKENS, {
      accessToken,
      idToken,
      refreshToken,
      webId,
      expiresAt,
      dpopKey,
      clientId: clientInfo.clientId,
      issuer: oidcContext.issuerConfig.issuer,
    });

    await saveSessionInfoToStorage(
      this.storageUtility,
      sessionId,
      webId,
      clientId,
      "true",
      refreshToken,
      undefined,
      dpopKey,
    );

    const sessionInfo = await this.sessionInfoManager.get(sessionId);
    if (!sessionInfo) {
      throw new Error(
        `Could not find any session information associated with SessionID [${sessionId}] in our storage.`,
      );
    }

    return Object.assign(sessionInfo, {
      fetch: authFetch,
      expirationDate:
        expiresIn !== undefined ? expiresIn * 1000 + Date.now() : undefined,
      getLogoutUrl: maybeBuildRpInitiatedLogout({
        idTokenHint: idToken,
        endSessionEndpoint: oidcContext.issuerConfig.endSessionEndpoint,
      }),
    } as IncomingRedirectResult);
  }
}
