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
 * Handler for the Refresh Token Flow
 */
import type {
  IOidcHandler,
  IOidcOptions,
  IStorageUtility,
  LoginResult,
  ISessionInfo,
  KeyPair,
  RefreshOptions,
  ITokenRefresher,
  TokenEndpointResponse,
} from "@inrupt/solid-client-authn-core";
import {
  saveSessionInfoToStorage,
  getWebidFromTokenPayload,
  generateDpopKeyPair,
  PREFERRED_SIGNING_ALG,
  buildAuthenticatedFetch,
} from "@inrupt/solid-client-authn-core";
import type { JWK } from "jose";
import { importJWK } from "jose";
import { fetch as globalFetch } from "@inrupt/universal-fetch";
import type { EventEmitter } from "events";
import type { KeyObject } from "crypto";

function validateOptions(
  oidcLoginOptions: IOidcOptions,
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
  dpop: boolean,
  refreshBindingKey?: KeyPair,
  eventEmitter?: EventEmitter,
): Promise<TokenEndpointResponse & { fetch: typeof globalFetch }> {
  try {
    let dpopKey: KeyPair | undefined;
    if (dpop) {
      dpopKey = refreshBindingKey || (await generateDpopKeyPair());
      // The alg property isn't set by exportJWK, so set it manually.
      [dpopKey.publicKey.alg] = PREFERRED_SIGNING_ALG;
    }
    const tokens = await refreshOptions.tokenRefresher.refresh(
      refreshOptions.sessionId,
      refreshOptions.refreshToken,
      dpopKey,
    );
    // Rotate the refresh token if applicable
    const rotatedRefreshOptions = {
      ...refreshOptions,
      refreshToken: tokens.refreshToken ?? refreshOptions.refreshToken,
    };
    const authFetch = await buildAuthenticatedFetch(
      globalFetch,
      tokens.accessToken,
      {
        dpopKey,
        refreshOptions: rotatedRefreshOptions,
        eventEmitter,
      },
    );
    return Object.assign(tokens, {
      fetch: authFetch,
    });
  } catch (e) {
    throw new Error(`Invalid refresh credentials: ${e}`);
  }
}

/**
 * @hidden
 * Refresh token flow spec: https://openid.net/specs/openid-connect-core-1_0.html#RefreshTokens
 */
export default class RefreshTokenOidcHandler implements IOidcHandler {
  constructor(
    private tokenRefresher: ITokenRefresher,
    private storageUtility: IStorageUtility,
  ) {
    this.tokenRefresher = tokenRefresher;
    this.storageUtility = storageUtility;
  }

  async canHandle(oidcLoginOptions: IOidcOptions): Promise<boolean> {
    return validateOptions(oidcLoginOptions);
  }

  async handle(oidcLoginOptions: IOidcOptions): Promise<LoginResult> {
    if (!(await this.canHandle(oidcLoginOptions))) {
      throw new Error(
        `RefreshTokenOidcHandler cannot handle the provided options, missing one of 'refreshToken', 'clientId' in: ${JSON.stringify(
          oidcLoginOptions,
        )}`,
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

    // In the case when the refresh token is bound to a DPoP key, said key must
    // be used during the refresh grant.
    const publicKey = await this.storageUtility.getForUser(
      oidcLoginOptions.sessionId,
      "publicKey",
    );
    const privateKey = await this.storageUtility.getForUser(
      oidcLoginOptions.sessionId,
      "privateKey",
    );
    let keyPair: undefined | KeyPair;
    if (publicKey !== undefined && privateKey !== undefined) {
      keyPair = {
        publicKey: JSON.parse(publicKey) as JWK,
        privateKey: (await importJWK(
          JSON.parse(privateKey),
          PREFERRED_SIGNING_ALG[0],
        )) as KeyObject,
      };
    }

    const accessInfo = await refreshAccess(
      refreshOptions,
      oidcLoginOptions.dpop,
      keyPair,
    );

    const sessionInfo: ISessionInfo = {
      isLoggedIn: true,
      sessionId: oidcLoginOptions.sessionId,
    };

    if (accessInfo.idToken === undefined) {
      throw new Error(
        `The Identity Provider [${oidcLoginOptions.issuer}] did not return an ID token on refresh, which prevents us from getting the user's WebID.`,
      );
    }
    sessionInfo.webId = await getWebidFromTokenPayload(
      accessInfo.idToken,
      oidcLoginOptions.issuerConfiguration.jwksUri,
      oidcLoginOptions.issuer,
      oidcLoginOptions.client.clientId,
    );

    await saveSessionInfoToStorage(
      this.storageUtility,
      oidcLoginOptions.sessionId,
      undefined,
      "true",
      accessInfo.refreshToken ?? refreshOptions.refreshToken,
      undefined,
      keyPair,
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
    let expirationDate: number | undefined;
    expirationDate = accessInfo.expiresAt;
    if (expirationDate === undefined && accessInfo.expiresIn !== undefined) {
      expirationDate = accessInfo.expiresIn + Date.now();
    }
    sessionInfo.expirationDate = expirationDate;

    return Object.assign(sessionInfo, {
      fetch: accessInfo.fetch,
    });
  }
}
