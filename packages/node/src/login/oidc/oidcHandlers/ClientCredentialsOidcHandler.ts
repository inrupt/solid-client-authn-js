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

/**
 * Handler for the Client Credentials Flow
 */
import {
  IOidcHandler,
  IOidcOptions,
  LoginResult,
  IStorageUtility,
  ISessionInfo,
  KeyPair,
  generateDpopKeyPair,
  PREFERRED_SIGNING_ALG,
  getWebidFromTokenPayload,
  buildAuthenticatedFetch,
  ITokenRefresher,
} from "@inrupt/solid-client-authn-core";
import { KeyObject } from "crypto";
import { Issuer } from "openid-client";
import { fetch as globalFetch } from "cross-fetch";
import { configToIssuerMetadata } from "../IssuerConfigFetcher";

/**
 * @hidden
 */
export default class ClientCredentialsOidcHandler implements IOidcHandler {
  constructor(
    private tokenRefresher: ITokenRefresher,
    private _storageUtility: IStorageUtility
  ) {}

  async canHandle(oidcLoginOptions: IOidcOptions): Promise<boolean> {
    return (
      typeof oidcLoginOptions.client.clientId === "string" &&
      typeof oidcLoginOptions.client.clientSecret === "string" &&
      oidcLoginOptions.client.clientType === "static"
    );
  }

  async handle(oidcLoginOptions: IOidcOptions): Promise<LoginResult> {
    const issuer = new Issuer(
      configToIssuerMetadata(oidcLoginOptions.issuerConfiguration)
    );
    const client = new issuer.Client({
      client_id: oidcLoginOptions.client.clientId,
      client_secret: oidcLoginOptions.client.clientSecret,
    });

    let dpopKey: KeyPair | undefined;

    if (oidcLoginOptions.dpop) {
      dpopKey = await generateDpopKeyPair();
      // The alg property isn't set by fromKeyLike, so set it manually.
      [dpopKey.publicKey.alg] = PREFERRED_SIGNING_ALG;
    }

    const tokens = await client.grant(
      {
        grant_type: "client_credentials",
        token_endpoint_auth_method: "client_secret_basic",
      },
      {
        DPoP:
          oidcLoginOptions.dpop && dpopKey !== undefined
            ? (dpopKey.privateKey as KeyObject)
            : undefined,
      }
    );

    if (tokens.access_token === undefined) {
      throw new Error(
        `Invalid response from Solid Identity Provider [${
          oidcLoginOptions.issuer
        }]: ${JSON.stringify(tokens)} is missing 'access_token'.`
      );
    }

    if (tokens.id_token === undefined) {
      throw new Error(
        `Invalid response from Solid Identity Provider [${
          oidcLoginOptions.issuer
        }]: ${JSON.stringify(tokens)} is missing 'id_token'`
      );
    }

    const authFetch = await buildAuthenticatedFetch(
      globalFetch,
      tokens.access_token,
      {
        dpopKey,
        refreshOptions: tokens.refresh_token
          ? {
              refreshToken: tokens.refresh_token,
              sessionId: oidcLoginOptions.sessionId,
              tokenRefresher: this.tokenRefresher,
            }
          : undefined,
        eventEmitter: oidcLoginOptions.eventEmitter,
      }
    );

    const sessionInfo: ISessionInfo = {
      isLoggedIn: true,
      sessionId: oidcLoginOptions.sessionId,
      webId: await getWebidFromTokenPayload(
        tokens.id_token,
        oidcLoginOptions.issuerConfiguration.jwksUri,
        oidcLoginOptions.issuer,
        oidcLoginOptions.client.clientId
      ),
    };

    return Object.assign(sessionInfo, {
      fetch: authFetch,
    });
  }
}
