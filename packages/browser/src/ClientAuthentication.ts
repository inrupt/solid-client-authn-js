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

import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import {
  ILoginInputOptions,
  ILoginHandler,
  ILogoutHandler,
  IRedirectHandler,
  ISessionInfo,
  ISessionInfoManager,
  IIssuerConfigFetcher,
} from "@inrupt/solid-client-authn-core";
import { removeOidcQueryParam, validateIdToken } from "@inrupt/oidc-client-ext";
import { KEY_CURRENT_SESSION, KEY_CURRENT_URL } from "./constant";

// TMP: This ensures that the HTTP requests will include any relevant cookie
// that could have been set by the resource server.
// https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters
export const fetchWithCookies = (
  info: RequestInfo,
  init?: RequestInit
): ReturnType<typeof fetch> => {
  return window.fetch(info, {
    ...init,
    credentials: "include",
  });
};

/**
 * @hidden
 */
@injectable()
export default class ClientAuthentication {
  constructor(
    @inject("loginHandler") private loginHandler: ILoginHandler,
    @inject("redirectHandler") private redirectHandler: IRedirectHandler,
    @inject("logoutHandler") private logoutHandler: ILogoutHandler,
    @inject("sessionInfoManager")
    private sessionInfoManager: ISessionInfoManager,
    @inject("issuerConfigFetcher")
    private issuerConfigFetcher: IIssuerConfigFetcher
  ) {}

  // Define these functions as properties so that they don't get accidentally re-bound.
  // Isn't Javascript fun?
  login = async (
    sessionId: string,
    options: ILoginInputOptions & {
      // TODO: the 'prompt' parameter shouldn't be exposed as part of the public API.
      // This classe's login should take the internal IOidcOptions type as an
      // input, will be fixed later.
      prompt?: string;
    }
  ): Promise<void> => {
    // In order to get a clean start, make sure that the session is logged out
    // on login.
    // But we may want to preserve our client application info, particularly if
    // we used Dynamic Client Registration to register (since we don't
    // necessarily want the user to have to register this app each time they
    // login).
    await this.sessionInfoManager.clear(sessionId);

    // In the case of the user hitting the 'back' button in their browser, they
    // could return to a previous redirect URL that contains OIDC params that
    // are now longer valid - so just to be safe, strip relevant params now.
    const redirectUrl = removeOidcQueryParam(
      options.redirectUrl ?? window.location.href
    );

    await this.loginHandler.handle({
      sessionId,
      oidcIssuer: options.oidcIssuer,
      redirectUrl,
      clientId: options.clientId,
      clientSecret: options.clientSecret,
      clientName: options.clientName ?? options.clientId,
      popUp: options.popUp || false,
      handleRedirect: options.handleRedirect,
      // Defaults to DPoP
      tokenType: options.tokenType ?? "DPoP",
      prompt: options.prompt,
    });
  };

  // By default, our fetch() resolves to the environment fetch() function.
  fetch = fetchWithCookies;

  logout = async (sessionId: string): Promise<void> => {
    await this.logoutHandler.handle(sessionId);

    // Restore our fetch() function back to the environment fetch(), effectively
    // leaving us with un-authenticated fetches from now on.
    this.fetch = (
      info: RequestInfo,
      init?: RequestInit
    ): ReturnType<typeof fetch> => window.fetch(info, init);
  };

  getSessionInfo = async (
    sessionId: string
  ): Promise<ISessionInfo | undefined> => {
    // TODO complete
    return this.sessionInfoManager.get(sessionId);
  };

  getAllSessionInfo = async (): Promise<ISessionInfo[]> => {
    return this.sessionInfoManager.getAll();
  };

  getCurrentIssuer = async (): Promise<string | null> => {
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
      const issuerResponse = await fetch(issuerConfig.jwksUri);
      const jwks = await issuerResponse.json();
      if (
        await validateIdToken(
          sessionInfo.idToken,
          jwks,
          sessionInfo.issuer,
          sessionInfo.clientAppId
        )
      ) {
        return sessionInfo.issuer;
      }
    } catch (e) {
      // If an error happens when fetching the keys, the issuer cannot be trusted.
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

    // Check if we have an ID Token in storage - if we do then we may be
    // currently logged in, and the user has refreshed their browser page. In
    // this case, it can be really useful to save the user's current browser
    // location, so that we can restore that location after we complete the
    // entire re-login-the-user-silently-flow (e.g., if the user was on a
    // specific 'page' of a Single Page App, then presumably they'll expect to
    // be brought back to exactly that same 'page' after the full refresh).
    const sessionInfo = await this.sessionInfoManager.get(
      redirectInfo.sessionId
    );
    if (sessionInfo?.idToken !== undefined) {
      localStorage.setItem(KEY_CURRENT_URL, window.location.toString());
    }

    return {
      isLoggedIn: redirectInfo.isLoggedIn,
      webId: redirectInfo.webId,
      sessionId: redirectInfo.sessionId,
      expirationDate: redirectInfo.expirationDate,
    };
  };
}
