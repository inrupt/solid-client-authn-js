/*
 * Copyright 2022 Inrupt Inc.
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
  buildAuthenticatedFetch,
  IClient,
  IClientRegistrar,
  IIssuerConfigFetcher,
  IRedirectHandler,
  ISessionInfo,
  ISessionInfoManager,
  IStorageUtility,
  ITokenRefresher,
  loadOidcContextFromStorage,
  RefreshOptions,
} from "@inrupt/solid-client-authn-core";
import {
  getDpopToken,
  getBearerToken,
  CodeExchangeResult,
} from "@inrupt/oidc-client-ext";
import { EventEmitter } from "events";

// A lifespan of 30 minutes is ESS's default. This could be removed if we
// configure the server to return the remaining lifespan of the cookie.
export const DEFAULT_LIFESPAN = 30 * 60 * 1000;

/**
 * Stores the resource server session information in local storage, so that they
 * can be used on refresh.
 * @param webId
 * @param authenticatedFetch
 * @param storageUtility
 */
async function setupResourceServerSession(
  webId: string,
  authenticatedFetch: typeof fetch,
  storageUtility: IStorageUtility
): Promise<void> {
  const webIdAsUrl = new URL(webId);
  const resourceServerIri = webIdAsUrl.origin;
  // Querying the /session endpoint does not set the cookie, but issuing an
  // authenticated request to any actual resource (even public ones) does,
  // so we fetch the user's WebID before checking the /session endpoint.
  await authenticatedFetch(webId);
  try {
    const resourceServerResponse = await authenticatedFetch(
      `${resourceServerIri}/session`
    );

    if (resourceServerResponse.status === 200) {
      await storageUtility.storeResourceServerSessionInfo(
        webId,
        resourceServerIri,
        // Note that here, if the lifespan of the cookie was returned by the
        // server, we'd expect a relative value (the remaining time of validity)
        // rather than an absolute one (the moment when the cookie expires).
        Date.now() + DEFAULT_LIFESPAN
      );
      return;
    }
    // In this case, the resource server either:
    // - does not have the expected endpoint, or
    // - does not recognize the user
    // Either way, no cookie is expected to be set there, and any existing
    // session information should be cleared.
    await storageUtility.clearResourceServerSessionInfo(resourceServerIri);
  } catch (_e) {
    // Setting the `credentials=include` option on fetch, which is required in
    // the current approach based on a RS cookie, may result in an error if
    // attempting to access an URL, depending on the CORS policies.
    // Since this internal fetch is necessary, and out of control of the
    // calling library, there is no other solution but to swallow the exception.
    // This may happen depending on how the target RS handles a request to the
    // /session endpoint.
    await storageUtility.clearResourceServerSessionInfo(resourceServerIri);
  }
}

/**
 * @hidden
 */
export class AuthCodeRedirectHandler implements IRedirectHandler {
  constructor(
    private storageUtility: IStorageUtility,
    private sessionInfoManager: ISessionInfoManager,
    private issuerConfigFetcher: IIssuerConfigFetcher,
    private clientRegistrar: IClientRegistrar,
    private tokerRefresher: ITokenRefresher
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
    redirectUrl: string,
    eventEmitter?: EventEmitter
  ): Promise<ISessionInfo & { fetch: typeof fetch }> {
    if (!(await this.canHandle(redirectUrl))) {
      throw new Error(
        `AuthCodeRedirectHandler cannot handle [${redirectUrl}]: it is missing one of [code, state].`
      );
    }

    const url = new URL(redirectUrl);
    const oauthState = url.searchParams.get("state") as string;

    const storedSessionId = (await this.storageUtility.getForUser(
      oauthState,
      "sessionId",
      {
        errorIfNull: true,
      }
    )) as string;

    const {
      issuerConfig,
      codeVerifier,
      redirectUrl: storedRedirectIri,
      dpop: isDpop,
    } = await loadOidcContextFromStorage(
      storedSessionId,
      this.storageUtility,
      this.issuerConfigFetcher
    );

    if (codeVerifier === undefined) {
      throw new Error(
        `The code verifier for session ${storedSessionId} is missing from storage.`
      );
    }

    if (storedRedirectIri === undefined) {
      throw new Error(
        `The redirect URL for session ${storedSessionId} is missing from storage.`
      );
    }

    const client: IClient = await this.clientRegistrar.getClient(
      { sessionId: storedSessionId },
      issuerConfig
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

    const authFetch = await buildAuthenticatedFetch(fetch, tokens.accessToken, {
      dpopKey: tokens.dpopKey,
      refreshOptions,
      eventEmitter,
      expiresIn: tokens.expiresIn,
    });

    await this.storageUtility.setForUser(
      storedSessionId,
      {
        webId: tokens.webId,
        isLoggedIn: "true",
      },
      { secure: true }
    );
    // Clear the code query param from the redirect URL before storing it, but
    // preserve any state that my have been provided by the client and returned
    // by the IdP.
    url.searchParams.delete("code");
    await this.storageUtility.setForUser(
      storedSessionId,
      {
        redirectUrl: url.toString(),
      },
      {
        secure: false,
      }
    );
    // TODO: This is a temporary workaround. When deprecating the cookie-based auth,
    // this should be all cleared.
    const essWorkaroundDisabled =
      window.localStorage.getItem("tmp-resource-server-session-enabled") ===
      "false";
    if (!essWorkaroundDisabled) {
      await setupResourceServerSession(
        tokens.webId,
        authFetch,
        this.storageUtility
      );
    }

    const sessionInfo = await this.sessionInfoManager.get(storedSessionId);
    if (!sessionInfo) {
      throw new Error(`Could not retrieve session: [${storedSessionId}].`);
    }

    return Object.assign(sessionInfo, {
      fetch: authFetch,
      expirationDate:
        typeof tokens.expiresIn === "number"
          ? tokenCreatedAt + tokens.expiresIn * 1000
          : null,
    });
  }
}
