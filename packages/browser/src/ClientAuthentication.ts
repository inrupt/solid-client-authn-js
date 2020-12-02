/*
 * Copyright 2020 Inrupt Inc.
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

import { injectable, inject } from "tsyringe";
import {
  ILoginInputOptions,
  ILoginHandler,
  ILogoutHandler,
  IRedirectHandler,
  ISessionInfo,
  ISessionInfoManager,
} from "@inrupt/solid-client-authn-core";
import { removeOidcQueryParam } from "@inrupt/oidc-client-ext";

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
    private sessionInfoManager: ISessionInfoManager
  ) {}

  // Define these functions as properties so that they don't get accidentally re-bound.
  // Isn't Javascript fun?
  login = async (
    sessionId: string,
    options: ILoginInputOptions
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

    return this.loginHandler.handle({
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
    });
  };

  // By default, our fetch() resolves to the environment fetch() function.
  fetch = window.fetch;

  logout = async (sessionId: string): Promise<void> => {
    await this.logoutHandler.handle(sessionId);

    // Restore our fetch() function back to the environment fetch(), effectively
    // leaving us with un-authenticated fetches from now on.
    this.fetch = window.fetch;
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

    // Remove OAuth-specific query params (since the login flow finishes with the
    // browser being redirected back with OAuth2 query params (e.g. for 'code'
    // and 'state'), and so if the user simply refreshes this page our
    // authentication library will be called again with what are now invalid
    // query parameters!).
    window.history.replaceState(null, "", cleanedUpUrl.toString());

    return {
      isLoggedIn: redirectInfo.isLoggedIn,
      webId: redirectInfo.webId,
      sessionId: redirectInfo.sessionId,
    };
  };
}
