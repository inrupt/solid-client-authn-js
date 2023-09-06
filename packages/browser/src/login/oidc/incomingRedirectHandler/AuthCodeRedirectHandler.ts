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
// FIXME: The following doesn't work in the browser, it results in all the fetches
// being unauthenticated. This should be looked into when migrating to universal-fetch.
// import { fetch } from "cross-fetch";

import { fetch as uniFetch } from "@inrupt/universal-fetch";

import type {
  IClient,
  IClientRegistrar,
  IIssuerConfigFetcher,
  IIncomingRedirectHandler,
  ISessionInfoManager,
  IStorageUtility,
  ITokenRefresher,
  RefreshOptions,
  IncomingRedirectResult,
} from "@inrupt/solid-client-authn-core";
import {
  buildAuthenticatedFetch,
  loadOidcContextFromStorage,
  maybeBuildRpInitiatedLogout,
} from "@inrupt/solid-client-authn-core";
import type { CodeExchangeResult } from "@inrupt/oidc-client-ext";
import { getDpopToken, getBearerToken } from "@inrupt/oidc-client-ext";
import type { EventEmitter } from "events";

const globalFetch: typeof uniFetch = (...args) =>
  uniFetch.call(globalThis, ...args);

/**
 * @hidden
 */
export class AuthCodeRedirectHandler implements IIncomingRedirectHandler {
  constructor(
    private storageUtility: IStorageUtility,
    private sessionInfoManager: ISessionInfoManager,
    private issuerConfigFetcher: IIssuerConfigFetcher,
    private clientRegistrar: IClientRegistrar,
    private tokerRefresher: ITokenRefresher,
  ) {
    this.storageUtility = storageUtility;
    this.sessionInfoManager = sessionInfoManager;
    this.issuerConfigFetcher = issuerConfigFetcher;
    this.clientRegistrar = clientRegistrar;
    this.tokerRefresher = tokerRefresher;
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
    redirectUrl: string,
    eventEmitter?: EventEmitter,
  ): Promise<IncomingRedirectResult> {
    if (!(await this.canHandle(redirectUrl))) {
      throw new Error(
        `AuthCodeRedirectHandler cannot handle [${redirectUrl}]: it is missing one of [code, state].`,
      );
    }

    const url = new URL(redirectUrl);
    const oauthState = url.searchParams.get("state") as string;

    const storedSessionId = (await this.storageUtility.getForUser(
      oauthState,
      "sessionId",
      {
        errorIfNull: true,
      },
    )) as string;

    const {
      issuerConfig,
      codeVerifier,
      redirectUrl: storedRedirectIri,
      dpop: isDpop,
    } = await loadOidcContextFromStorage(
      storedSessionId,
      this.storageUtility,
      this.issuerConfigFetcher,
    );

    const iss = url.searchParams.get("iss");

    if (typeof iss === "string" && iss !== issuerConfig.issuer) {
      throw new Error(
        `The value of the iss parameter (${iss}) does not match the issuer identifier of the authorization server (${issuerConfig.issuer}). See [rfc9207](https://www.rfc-editor.org/rfc/rfc9207.html#section-2.3-3.1.1)`,
      );
    }

    if (codeVerifier === undefined) {
      throw new Error(
        `The code verifier for session ${storedSessionId} is missing from storage.`,
      );
    }

    if (storedRedirectIri === undefined) {
      throw new Error(
        `The redirect URL for session ${storedSessionId} is missing from storage.`,
      );
    }

    const client: IClient = await this.clientRegistrar.getClient(
      { sessionId: storedSessionId },
      issuerConfig,
    );

    let tokens: CodeExchangeResult;
    const tokenCreatedAt = Date.now();

    if (isDpop) {
      tokens = await getDpopToken(issuerConfig, client, {
        grantType: "authorization_code",
        // We rely on our 'canHandle' function checking that the OAuth 'code'
        // parameter is present in our query string.
        code: url.searchParams.get("code") as string,
        codeVerifier,
        redirectUrl: storedRedirectIri,
      });

      // Delete oidc-client-specific session information from storage. This is
      // done automatically when retrieving a bearer token, but since the DPoP
      // binding uses our custom code, this needs to be done manually.
      window.localStorage.removeItem(`oidc.${oauthState}`);
    } else {
      tokens = await getBearerToken(url.toString());
    }

    let refreshOptions: RefreshOptions | undefined;
    if (tokens.refreshToken !== undefined) {
      refreshOptions = {
        sessionId: storedSessionId,
        refreshToken: tokens.refreshToken,
        tokenRefresher: this.tokerRefresher,
      };
    }

    const authFetch = await buildAuthenticatedFetch(
      globalFetch,
      tokens.accessToken,
      {
        dpopKey: tokens.dpopKey,
        refreshOptions,
        eventEmitter,
        expiresIn: tokens.expiresIn,
      },
    );

    await this.storageUtility.setForUser(
      storedSessionId,
      {
        webId: tokens.webId,
        isLoggedIn: "true",
      },
      { secure: true },
    );

    const sessionInfo = await this.sessionInfoManager.get(storedSessionId);
    if (!sessionInfo) {
      throw new Error(`Could not retrieve session: [${storedSessionId}].`);
    }

    return Object.assign(sessionInfo, {
      fetch: authFetch,
      getLogoutUrl: maybeBuildRpInitiatedLogout({
        idTokenHint: tokens.idToken,
        endSessionEndpoint: issuerConfig.endSessionEndpoint,
      }),
      expirationDate:
        typeof tokens.expiresIn === "number"
          ? tokenCreatedAt + tokens.expiresIn * 1000
          : undefined,
    } as IncomingRedirectResult);
  }
}
