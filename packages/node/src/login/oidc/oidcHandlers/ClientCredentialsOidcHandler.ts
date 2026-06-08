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

/**
 * Handler for the Client Credentials Flow
 */
// ---------------------------------------------------------------------------
// MIGRATION: oauth4webapi + dpop — Phase 4 (proposal/migrate-to-oauth4webapi)
// ---------------------------------------------------------------------------
// Before: `openid-client` `client.grant({ grant_type: "client_credentials" })`
// with a `KeyObject`-bridged DPoP key (`asDPoPInput`).
//
// After: `oauth.clientCredentialsGrantRequest` +
// `oauth.processClientCredentialsResponse` with a per-flow `oauth.DPoP()` handle
// built from a fresh `oauth.generateKeyPair` (extractable — persisted for the
// keepAlive refresh flow). Mirrors `@solid/reactive-authentication`'s
// `ClientCredentialsTokenProvider`.
//
// CONFORMANCE-CRITICAL: the CTH / ESS bot use case logs in via this handler to
// obtain a DPoP-bound `at+jwt`. Client auth uses the NON-URL-encoding
// ClientSecretBasic variant (see `oauth/oauthAdapter.ts` `clientAuthFor`) to
// match the legacy openid-client behaviour and ESS expectations.
// ---------------------------------------------------------------------------
import type {
  IOidcHandler,
  IOidcOptions,
  LoginResult,
  ISessionInfo,
  KeyPair,
  ITokenRefresher,
} from "@inrupt/solid-client-authn-core";
import {
  getWebidFromTokenPayload,
  buildAuthenticatedFetch,
  EVENTS,
} from "@inrupt/solid-client-authn-core";
import * as oauth from "oauth4webapi";
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
 */
export default class ClientCredentialsOidcHandler implements IOidcHandler {
  constructor(private tokenRefresher: ITokenRefresher) {
    this.tokenRefresher = tokenRefresher;
  }

  async canHandle(oidcLoginOptions: IOidcOptions): Promise<boolean> {
    return (
      // If a redirect URL is present, the static client should use the
      // authorization code flow.
      typeof oidcLoginOptions.redirectUrl !== "string" &&
      typeof oidcLoginOptions.client.clientSecret === "string"
    );
  }

  async handle(oidcLoginOptions: IOidcOptions): Promise<LoginResult> {
    const as = asAuthorizationServer(oidcLoginOptions.issuerConfiguration);
    const oauthClient = asOauthClient(oidcLoginOptions.client);
    const clientAuth = clientAuthFor(oidcLoginOptions.client);

    let dpopKey: KeyPair | undefined;
    let dpop: oauth.DPoPHandle | undefined;
    if (oidcLoginOptions.dpop) {
      // Extractable: the key may be persisted for the keepAlive refresh flow
      // (see generateDpopCryptoKeyPair). TODO(migration): non-extractable.
      const cryptoKeyPair = await generateDpopCryptoKeyPair();
      dpopKey = await keyPairFromCryptoKeyPair(cryptoKeyPair);
      dpop = dpopHandle(oidcLoginOptions.client, cryptoKeyPair);
    }

    let tokens: oauth.TokenEndpointResponse;
    try {
      const grant = async (): Promise<oauth.TokenEndpointResponse> => {
        const tokenResponse = await oauth.clientCredentialsGrantRequest(
          as,
          oauthClient,
          clientAuth,
          // Passing scopes space-separated, as required by the spec.
          { scope: oidcLoginOptions.scopes.join(" ") },
          dpop ? { DPoP: dpop } : {},
        );
        return oauth.processClientCredentialsResponse(
          as,
          oauthClient,
          tokenResponse,
        );
      };
      tokens = await grant().catch(async (err) => {
        if (oauth.isDPoPNonceError(err) && dpop) {
          return grant();
        }
        throw err;
      });
    } catch (err) {
      return mapOauthError(err);
    }

    let webId: string;
    let clientId: string | undefined;
    if (tokens.access_token === undefined) {
      throw new Error(
        `Invalid response from Solid Identity Provider [${
          oidcLoginOptions.issuer
        }]: ${JSON.stringify(tokens)} is missing 'access_token'.`,
      );
    }

    if (tokens.id_token === undefined) {
      // In the case where no ID token is provided, the access token is used to
      // get the authenticated user's WebID. This is only a temporary solution,
      // as eventually we want to move away from the Identity Provider issuing
      // Access Tokens, but by then panel work for the bot use case support will
      // have moved forward.
      ({ webId, clientId } = await getWebidFromTokenPayload(
        tokens.access_token,
        oidcLoginOptions.issuerConfiguration.jwksUri,
        oidcLoginOptions.issuer,
        // When validating the Access Token, the audience should always be 'solid'
        "solid",
      ));
    } else {
      ({ webId, clientId } = await getWebidFromTokenPayload(
        tokens.id_token,
        oidcLoginOptions.issuerConfiguration.jwksUri,
        oidcLoginOptions.issuer,
        oidcLoginOptions.client.clientId,
      ));
    }

    const authFetch = buildAuthenticatedFetch(tokens.access_token, {
      dpopKey,
      refreshOptions:
        oidcLoginOptions.keepAlive && tokens.refresh_token
          ? {
              refreshToken: tokens.refresh_token,
              sessionId: oidcLoginOptions.sessionId,
              tokenRefresher: this.tokenRefresher,
            }
          : undefined,
      eventEmitter: oidcLoginOptions.eventEmitter,
      expiresIn: tokens.expires_in,
    });

    const expiresAt =
      tokens.expires_in !== undefined
        ? Date.now() + tokens.expires_in * 1000
        : undefined;
    oidcLoginOptions.eventEmitter?.emit(EVENTS.NEW_TOKENS, {
      accessToken: tokens.access_token,
      idToken: tokens.id_token,
      // Unlike what its type declaration says, the refresh token may be null
      refreshToken: tokens.refresh_token ?? undefined,
      webId,
      expiresAt,
      dpopKey,
      clientId: oidcLoginOptions.client.clientId,
      issuer: oidcLoginOptions.issuer,
    });

    const sessionInfo: ISessionInfo = {
      isLoggedIn: true,
      sessionId: oidcLoginOptions.sessionId,
      webId,
      clientAppId: clientId,
      expirationDate: expiresAt,
    };
    return Object.assign(sessionInfo, {
      fetch: authFetch,
    });
  }
}
