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
 * Handler for the Refresh Token Flow
 */
import {
  IOidcHandler,
  IOidcOptions,
  IStorageUtility,
  LoginResult,
  saveSessionInfoToStorage,
} from "@inrupt/solid-client-authn-core";
import { JWK } from "jose";
import { TokenSet } from "openid-client";
import { inject, injectable } from "tsyringe";
import { ISessionInfo } from "../../../../../core/dist";
import {
  buildBearerFetch,
  buildDpopFetch,
  RefreshOptions,
} from "../../../authenticatedFetch/fetchFactory";
import { getWebidFromTokenPayload } from "../redirectHandler/AuthCodeRedirectHandler";
import { ITokenRefresher } from "../refresh/TokenRefresher";

function validateOptions(
  oidcLoginOptions: IOidcOptions
): oidcLoginOptions is IOidcOptions & {
  refreshToken: string;
  client: { clientId: string; clientSecret: string };
} {
  return (
    oidcLoginOptions.refreshToken !== undefined &&
    oidcLoginOptions.client.clientId !== undefined
  );
}

/**
 * Go through the refresh flow to get a new valid access token, and build an
 * authenticated fetch with it.
 * @param refreshOptions
 * @param dpop
 */
async function refreshAccess(
  refreshOptions: RefreshOptions,
  dpop: boolean
): Promise<TokenSet & { fetch: typeof fetch }> {
  let authFetch: typeof fetch;
  // eslint-disable-next-line camelcase
  let tokens: TokenSet & { access_token: string };
  let dpopKey: JWK.ECKey;
  try {
    if (dpop) {
      dpopKey = await JWK.generate("EC", "P-256");
      tokens = await refreshOptions.tokenRefresher.refresh(
        refreshOptions.sessionId,
        refreshOptions.refreshToken,
        dpopKey
      );
      // Rotate the refresh token if applicable
      const rotatedRefreshOptions = {
        ...refreshOptions,
        refreshToken: tokens.refresh_token ?? refreshOptions.refreshToken,
      };
      authFetch = await buildDpopFetch(
        tokens.access_token,
        dpopKey,
        rotatedRefreshOptions
      );
    } else {
      tokens = await refreshOptions.tokenRefresher.refresh(
        refreshOptions.sessionId,
        refreshOptions.refreshToken
      );
      const rotatedRefreshOptions = {
        ...refreshOptions,
        refreshToken: tokens.refresh_token ?? refreshOptions.refreshToken,
      };
      authFetch = buildBearerFetch(tokens.access_token, rotatedRefreshOptions);
    }
  } catch (e) {
    throw new Error(`Invalid refresh credentials: ${e.toString()}`);
  }
  return Object.assign(tokens, {
    fetch: authFetch,
  });
}

/**
 * @hidden
 */
@injectable()
export default class RefreshTokenOidcHandler implements IOidcHandler {
  constructor(
    @inject("node:tokenRefresher") private tokenRefresher: ITokenRefresher,
    @inject("node:storageUtility") private storageUtility: IStorageUtility
  ) {}

  async canHandle(oidcLoginOptions: IOidcOptions): Promise<boolean> {
    return validateOptions(oidcLoginOptions);
  }

  async handle(oidcLoginOptions: IOidcOptions): Promise<LoginResult> {
    if (!(await this.canHandle(oidcLoginOptions))) {
      throw new Error(
        `RefreshTokenOidcHandler cannot handle the provided options, missing one of 'refreshToken', 'clientId' in: ${JSON.stringify(
          oidcLoginOptions
        )}`
      );
    }
    const refreshOptions: RefreshOptions = {
      // The type assertion is okay, because it is tested for in canHandle.
      refreshToken: oidcLoginOptions.refreshToken as string,
      sessionId: oidcLoginOptions.sessionId,
      tokenRefresher: this.tokenRefresher,
    };

    // This information must be in storage for the refresh flow to succeed.
    await this.storageUtility.setForUser(oidcLoginOptions.sessionId, {
      issuer: oidcLoginOptions.issuer,
      dpop: oidcLoginOptions.dpop ? "true" : "false",
      clientId: oidcLoginOptions.client.clientId,
      // Note: We assume here that a client secret is present, which is checked for when validating the options.
      clientSecret: oidcLoginOptions.client.clientSecret as string,
    });

    const accessInfo = await refreshAccess(
      refreshOptions,
      oidcLoginOptions.dpop
    );

    const sessionInfo: ISessionInfo = {
      isLoggedIn: true,
      sessionId: oidcLoginOptions.sessionId,
    };

    if (accessInfo.id_token === undefined) {
      throw new Error(
        `The Identity Provider [${oidcLoginOptions.issuer}] did not return an ID token on refresh, which prevents us from getting the user's WebID.`
      );
    }
    sessionInfo.webId = await getWebidFromTokenPayload(accessInfo.claims());

    await saveSessionInfoToStorage(
      this.storageUtility,
      oidcLoginOptions.sessionId,
      undefined,
      undefined,
      "true",
      accessInfo.refresh_token ?? refreshOptions.refreshToken
    );

    await this.storageUtility.setForUser(oidcLoginOptions.sessionId, {
      issuer: oidcLoginOptions.issuer,
      dpop: oidcLoginOptions.dpop ? "true" : "false",
      clientId: oidcLoginOptions.client.clientId,
    });

    if (oidcLoginOptions.client.clientSecret) {
      await this.storageUtility.setForUser(oidcLoginOptions.sessionId, {
        clientSecret: oidcLoginOptions.client.clientSecret,
      });
    }
    if (oidcLoginOptions.client.clientName) {
      await this.storageUtility.setForUser(oidcLoginOptions.sessionId, {
        clientName: oidcLoginOptions.client.clientName,
      });
    }

    return Object.assign(sessionInfo, {
      fetch: accessInfo.fetch,
    });
  }
}
