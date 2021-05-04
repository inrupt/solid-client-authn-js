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
} from "@inrupt/solid-client-authn-core";
import { JWK } from "jose";
import { Issuer } from "openid-client";
import { inject, injectable } from "tsyringe";
import { buildAuthenticatedFetch } from "../../../authenticatedFetch/fetchFactory";
import { configToIssuerMetadata } from "../IssuerConfigFetcher";
import { getWebidFromTokenPayload } from "../redirectHandler/AuthCodeRedirectHandler";
import { ITokenRefresher } from "../refresh/TokenRefresher";

/**
 * @hidden
 */
@injectable()
export default class ClientCredentialsOidcHandler implements IOidcHandler {
  constructor(
    @inject("node:tokenRefresher") private tokenRefresher: ITokenRefresher,
    @inject("node:storageUtility") private storageUtility: IStorageUtility
  ) {}

  async canHandle(oidcLoginOptions: IOidcOptions): Promise<boolean> {
    return (
      typeof oidcLoginOptions.client.clientId === "string" &&
      typeof oidcLoginOptions.client.clientSecret === "string" &&
      typeof oidcLoginOptions.client.isPublic === "boolean" &&
      !oidcLoginOptions.client.isPublic
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

    let dpopKey: JWK.ECKey | undefined;

    if (oidcLoginOptions.dpop) {
      dpopKey = await JWK.generate("EC", "P-256");
    }

    const tokens = await client.grant(
      {
        grant_type: "client_credentials",
        client_id: oidcLoginOptions.client.clientId,
        client_secret: oidcLoginOptions.client.clientSecret,
        token_endpoint_auth_method: "client_secret_post",
      },
      {
        DPoP: oidcLoginOptions.dpop
          ? (dpopKey as JWK.ECKey).toJWK(true)
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

    const authFetch = await buildAuthenticatedFetch(tokens.access_token, {
      dpopKey,
      refreshOptions: tokens.refresh_token
        ? {
            refreshToken: tokens.refresh_token,
            sessionId: oidcLoginOptions.sessionId,
            tokenRefresher: this.tokenRefresher,
            onNewRefreshToken: oidcLoginOptions.onNewRefreshToken,
          }
        : undefined,
    });

    const sessionInfo: ISessionInfo = {
      isLoggedIn: true,
      sessionId: oidcLoginOptions.sessionId,
      webId: await getWebidFromTokenPayload(tokens.claims()),
    };

    return Object.assign(sessionInfo, {
      fetch: authFetch,
    });
  }
}
