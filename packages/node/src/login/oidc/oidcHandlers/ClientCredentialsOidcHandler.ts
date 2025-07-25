//
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
import type {
  IOidcHandler,
  IOidcOptions,
  LoginResult,
  ISessionInfo,
  KeyPair,
  ITokenRefresher,
} from "@inrupt/solid-client-authn-core";
import {
  generateDpopKeyPair,
  PREFERRED_SIGNING_ALG,
  getWebidFromTokenPayload,
  buildAuthenticatedFetch,
  EVENTS,
} from "@inrupt/solid-client-authn-core";
import type { KeyObject } from "crypto";
import { Issuer } from "openid-client";
import { configToIssuerMetadata } from "../IssuerConfigFetcher";

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
    const issuer = new Issuer(
      configToIssuerMetadata(oidcLoginOptions.issuerConfiguration),
    );
    const client = new issuer.Client({
      client_id: oidcLoginOptions.client.clientId,
      client_secret: oidcLoginOptions.client.clientSecret,
    });

    let dpopKey: KeyPair | undefined;

    if (oidcLoginOptions.dpop) {
      dpopKey = await generateDpopKeyPair();
      // The alg property isn't set by exportJWK, so set it manually.
      [dpopKey.publicKey.alg] = PREFERRED_SIGNING_ALG;
    }

    const tokens = await client.grant(
      {
        grant_type: "client_credentials",
        token_endpoint_auth_method: "client_secret_basic",
        // Passing scopes as an array of strings results in them being
        // comma-separated in the request, which is invalid.
        scope: oidcLoginOptions.scopes.join(" "),
      },
      {
        DPoP:
          oidcLoginOptions.dpop && dpopKey !== undefined
            ? (dpopKey.privateKey as KeyObject)
            : undefined,
      },
    );

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
