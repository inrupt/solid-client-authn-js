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

import { injectable, inject } from "tsyringe";
import {
  ILoginInputOptions,
  ILoginHandler,
  ILogoutHandler,
  IRedirectHandler,
  ISessionInfo,
  ISessionInternalInfo,
  ISessionInfoManager,
} from "@inrupt/solid-client-authn-core";
import { fetch } from "cross-fetch";

/**
 * @hidden
 */
@injectable()
export default class ClientAuthentication {
  constructor(
    @inject("node:loginHandler") private loginHandler: ILoginHandler,
    @inject("node:redirectHandler") private redirectHandler: IRedirectHandler,
    @inject("node:logoutHandler") private logoutHandler: ILogoutHandler,
    @inject("node:sessionInfoManager")
    private sessionInfoManager: ISessionInfoManager
  ) {}

  // Define these functions as properties so that they don't get accidentally re-bound.
  // Isn't Javascript fun?
  login = async (
    sessionId: string,
    options: ILoginInputOptions,
    handleRefreshToken?: (token: string) => unknown
  ): Promise<ISessionInfo | undefined> => {
    // Keep track of the session ID
    await this.sessionInfoManager.register(sessionId);
    const loginReturn = await this.loginHandler.handle({
      sessionId,
      oidcIssuer: options.oidcIssuer,
      redirectUrl: options.redirectUrl
        ? new URL(options.redirectUrl).href
        : undefined,
      clientId: options.clientId,
      clientSecret: options.clientSecret,
      clientName: options.clientName ?? options.clientId,
      popUp: options.popUp || false,
      refreshToken: options.refreshToken,
      handleRedirect: options.handleRedirect,
      // Defaults to DPoP
      tokenType: options.tokenType ?? "DPoP",
      handleRefreshTokenRotation: handleRefreshToken,
    });

    if (loginReturn !== undefined) {
      this.fetch = loginReturn.fetch;
      return {
        isLoggedIn: true,
        sessionId,
        webId: loginReturn.webId,
      };
    }

    // undefined is returned in the case when the login must be completed
    // after redirect.
    return undefined;
  };

  // By default, our fetch() resolves to the environment fetch() function.
  fetch = fetch;

  logout = async (sessionId: string): Promise<void> => {
    await this.logoutHandler.handle(sessionId);

    // Restore our fetch() function back to the environment fetch(), effectively
    // leaving us with un-authenticated fetches from now on.
    this.fetch = fetch;
  };

  getSessionInfo = async (
    sessionId: string
  ): Promise<(ISessionInfo & ISessionInternalInfo) | undefined> => {
    // TODO complete
    return this.sessionInfoManager.get(sessionId);
  };

  getSessionIdAll = async (): Promise<string[]> => {
    return this.sessionInfoManager.getRegisteredSessionIdAll();
  };

  registerSession = async (sessionId: string): Promise<void> => {
    return this.sessionInfoManager.register(sessionId);
  };

  clearSessionAll = async (): Promise<void> => {
    return this.sessionInfoManager.clearAll();
  };

  getAllSessionInfo = async (): Promise<ISessionInfo[]> => {
    return this.sessionInfoManager.getAll();
  };

  handleIncomingRedirect = async (
    url: string,
    handleRefreshToken?: (token: string) => unknown
  ): Promise<ISessionInfo | undefined> => {
    const redirectInfo = await this.redirectHandler.handle(
      url,
      handleRefreshToken
    );

    this.fetch = redirectInfo.fetch;

    return {
      isLoggedIn: redirectInfo.isLoggedIn,
      webId: redirectInfo.webId,
      sessionId: redirectInfo.sessionId,
    };
  };
}
