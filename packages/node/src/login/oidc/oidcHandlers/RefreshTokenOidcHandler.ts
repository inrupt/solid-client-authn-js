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
  maybeBuildRpInitiatedLogout,
} from "@inrupt/solid-client-authn-core";
import type { JWK } from "jose";
import { importJWK } from "jose";
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
  keepAlive: boolean,
  refreshBindingKey?: KeyPair,
  eventEmitter?: EventEmitter,
): Promise<TokenEndpointResponse & { fetch: typeof fetch }> {
  try {
    let dpopKey: KeyPair | undefined;
    if (dpop) {
      dpopKey = refreshBindingKey ?? (await generateDpopKeyPair());
      // The alg property isn't set by exportJWK, so set it manually.
      [dpopKey.publicKey.alg] = PREFERRED_SIGNING_ALG;
    }
    const tokens = await refreshOptions.tokenRefresher.refresh(
      refreshOptions.sessionId,
      refreshOptions.refreshToken,
      dpopKey,
      eventEmitter,
    );
    // Rotate the refresh token if applicable
    const rotatedRefreshOptions = {
      ...refreshOptions,
      refreshToken: tokens.refreshToken ?? refreshOptions.refreshToken,
    };
    const expiresInS =
      tokens.expiresIn ??
      (tokens.expiresAt ?? 0) - Math.trunc(Date.now() / 1000);
    const authFetch = buildAuthenticatedFetch(tokens.accessToken, {
      dpopKey,
      refreshOptions: keepAlive ? rotatedRefreshOptions : undefined,
      eventEmitter,
      expiresIn: expiresInS > 0 ? expiresInS : undefined,
    });
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
    if (!validateOptions(oidcLoginOptions)) {
      throw new Error(
        `RefreshTokenOidcHandler cannot handle the provided options, missing one of 'refreshToken', 'clientId' in: ${JSON.stringify(
          oidcLoginOptions,
        )}`,
      );
    }
    const refreshOptions: RefreshOptions = {
      refreshToken: oidcLoginOptions.refreshToken,
      sessionId: oidcLoginOptions.sessionId,
      tokenRefresher: this.tokenRefresher,
    };

    const dataToStore: Record<string, string> = {
      issuer: oidcLoginOptions.issuer,
      dpop: oidcLoginOptions.dpop ? "true" : "false",
      clientId: oidcLoginOptions.client.clientId,
    };

    if (typeof oidcLoginOptions.client.clientSecret === "string") {
      dataToStore.clientSecret = oidcLoginOptions.client.clientSecret;
    }

    if (typeof oidcLoginOptions.client.clientName === "string") {
      dataToStore.clientName = oidcLoginOptions.client.clientName;
    }

    // This information must be in storage for the refresh flow to succeed.
    await this.storageUtility.setForUser(
      oidcLoginOptions.sessionId,
      dataToStore,
    );

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
      oidcLoginOptions.keepAlive ?? true,
      keyPair,
      oidcLoginOptions.eventEmitter,
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
    ({ webId: sessionInfo.webId, clientId: sessionInfo.clientAppId } =
      await getWebidFromTokenPayload(
        accessInfo.idToken,
        oidcLoginOptions.issuerConfiguration.jwksUri,
        oidcLoginOptions.issuer,
        oidcLoginOptions.client.clientId,
      ));

    await saveSessionInfoToStorage(
      this.storageUtility,
      oidcLoginOptions.sessionId,
      undefined,
      sessionInfo.clientAppId,
      "true",
      accessInfo.refreshToken ?? refreshOptions.refreshToken,
      undefined,
      keyPair,
    );

    let expirationDate: number | undefined;
    if (accessInfo.expiresAt !== undefined) {
      expirationDate = accessInfo.expiresAt * 1000;
    } else if (accessInfo.expiresIn !== undefined) {
      expirationDate = accessInfo.expiresIn * 1000 + Date.now();
    }
    sessionInfo.expirationDate = expirationDate;

    return Object.assign(sessionInfo, {
      fetch: accessInfo.fetch,
      getLogoutUrl: maybeBuildRpInitiatedLogout({
        idTokenHint: accessInfo.idToken,
        endSessionEndpoint:
          oidcLoginOptions.issuerConfiguration.endSessionEndpoint,
      }),
    });
  }
}
