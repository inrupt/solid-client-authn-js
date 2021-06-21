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

import {
  ILoginHandler,
  ILogoutHandler,
  IRedirectHandler,
  ISessionInfo,
  ISessionInfoManager,
  IIssuerConfigFetcher,
  ISessionInternalInfo,
  ILoginOptions,
  fetchJwks,
} from "@inrupt/solid-client-authn-core";
import { removeOidcQueryParam } from "@inrupt/oidc-client-ext";
import { jwtVerify, parseJwk } from "@inrupt/jose-legacy-modules";
import { KEY_CURRENT_SESSION } from "./constant";

// By only referring to `window` at runtime, apps that do server-side rendering
// won't run into errors when rendering code that instantiates a
// ClientAuthentication:
const globalFetch: typeof window.fetch = (request, init) =>
  window.fetch(request, init);

/**
 * @hidden
 */
export default class ClientAuthentication {
  constructor(
    private loginHandler: ILoginHandler,
    private redirectHandler: IRedirectHandler,
    private logoutHandler: ILogoutHandler,
    private sessionInfoManager: ISessionInfoManager,
    private issuerConfigFetcher: IIssuerConfigFetcher
  ) {}

  // Define these functions as properties so that they don't get accidentally re-bound.
  // Isn't Javascript fun?
  login = async (options: ILoginOptions): Promise<void> => {
    // In order to get a clean start, make sure that the session is logged out
    // on login.
    // But we may want to preserve our client application info, particularly if
    // we used Dynamic Client Registration to register (since we don't
    // necessarily want the user to have to register this app each time they
    // login).
    await this.sessionInfoManager.clear(options.sessionId);

    // In the case of the user hitting the 'back' button in their browser, they
    // could return to a previous redirect URL that contains OIDC params that
    // are now longer valid - so just to be safe, strip relevant params now.
    const redirectUrl = removeOidcQueryParam(
      options.redirectUrl ?? window.location.href
    );

    await this.loginHandler.handle({
      ...options,
      redirectUrl,
      // If no clientName is provided, the clientId may be used instead.
      clientName: options.clientName ?? options.clientId,
    });
  };

  // By default, our fetch() resolves to the environment fetch() function.
  fetch = globalFetch;

  logout = async (sessionId: string): Promise<void> => {
    await this.logoutHandler.handle(sessionId);

    // Restore our fetch() function back to the environment fetch(), effectively
    // leaving us with un-authenticated fetches from now on.
    this.fetch = globalFetch;
  };

  getSessionInfo = async (
    sessionId: string
  ): Promise<(ISessionInfo & ISessionInternalInfo) | undefined> => {
    // TODO complete
    return this.sessionInfoManager.get(sessionId);
  };

  getAllSessionInfo = async (): Promise<ISessionInfo[]> => {
    return this.sessionInfoManager.getAll();
  };

  validateCurrentSession = async (): Promise<
    (ISessionInfo & ISessionInternalInfo) | null
  > => {
    const currentSessionId = window.localStorage.getItem(KEY_CURRENT_SESSION);
    if (currentSessionId === null) {
      return null;
    }
    const sessionInfo = await this.sessionInfoManager.get(currentSessionId);
    // Several types of session data are required in order to validate that the ID
    // token in storage hasn't been tampered with, and has actually been issued
    // by the issuer present in storage.
    if (
      sessionInfo === undefined ||
      sessionInfo.idToken === undefined ||
      sessionInfo.clientAppId === undefined ||
      sessionInfo.issuer === undefined
    ) {
      return null;
    }
    const issuerConfig = await this.issuerConfigFetcher.fetchConfig(
      sessionInfo.issuer
    );

    try {
      const jwk = await fetchJwks(issuerConfig.jwksUri, issuerConfig.issuer);
      await jwtVerify(sessionInfo.idToken, await parseJwk(jwk), {
        audience: sessionInfo.clientAppId,
        issuer: issuerConfig.issuer,
      });
      return sessionInfo;
    } catch (e) {
      // The jwt verification function throws on invalid token.
      // The error is swallowed, and `null` is eventually returned.
    }
    return null;
  };

  handleIncomingRedirect = async (
    url: string
  ): Promise<ISessionInfo | undefined> => {
    const redirectInfo = await this.redirectHandler.handle(url);

    this.fetch = redirectInfo.fetch;

    const cleanedUpUrl = new URL(url);
    cleanedUpUrl.searchParams.delete("state");
    // For auth code flow
    cleanedUpUrl.searchParams.delete("code");
    // For implicit flow
    cleanedUpUrl.searchParams.delete("id_token");
    cleanedUpUrl.searchParams.delete("access_token");

    // Remove OAuth-specific query params (since the login flow finishes with
    // the browser being redirected back with OAuth2 query params (e.g. for
    // 'code' and 'state'), and so if the user simply refreshes this page our
    // authentication library will be called again with what are now invalid
    // query parameters!).
    window.history.replaceState(null, "", cleanedUpUrl.toString());

    return {
      isLoggedIn: redirectInfo.isLoggedIn,
      webId: redirectInfo.webId,
      sessionId: redirectInfo.sessionId,
      expirationDate: redirectInfo.expirationDate,
    };
  };
}
