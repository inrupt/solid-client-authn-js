/**
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

import { injectable, inject } from "tsyringe";
import ILoginHandler from "./login/ILoginHandler";
import IRedirectHandler from "./login/oidc/redirectHandler/IRedirectHandler";
import ILogoutHandler from "./logout/ILogoutHandler";
import { ISessionInfoManager } from "./sessionInfo/SessionInfoManager";
import IAuthenticatedFetcher from "./authenticatedFetch/IAuthenticatedFetcher";
import { IEnvironmentDetector } from "./util/EnvironmentDetector";
import ISessionInfo from "./sessionInfo/ISessionInfo";
import ILoginInputOptions from "./ILoginInputOptions";
import URL from "url-parse";
import IRequestCredentials from "./authenticatedFetch/IRequestCredentials";

@injectable()
export default class AuthFetcher {
  constructor(
    @inject("loginHandler") private loginHandler: ILoginHandler,
    @inject("redirectHandler") private redirectHandler: IRedirectHandler,
    @inject("logoutHandler") private logoutHandler: ILogoutHandler,
    @inject("sessionInfoManager")
    private sessionInfoManager: ISessionInfoManager,
    @inject("authenticatedFetcher")
    private authenticatedFetcher: IAuthenticatedFetcher,
    @inject("environmentDetector")
    private environmentDetector: IEnvironmentDetector
  ) {}

  private urlOptionToUrl(url?: URL | string): URL | undefined {
    if (url) {
      if (typeof url !== "string") {
        return url;
      }
      return new URL(url);
    }
    return undefined;
  }

  async login(sessionId: string, options: ILoginInputOptions): Promise<void> {
    return this.loginHandler.handle({
      sessionId,
      oidcIssuer: this.urlOptionToUrl(options.oidcIssuer),
      redirectUrl: this.urlOptionToUrl(options.redirectUrl),
      clientId: options.clientId,
      clientSecret: options.clientSecret,
      clientName: options.clientId,
      popUp: options.popUp || false,
      handleRedirect: options.handleRedirect
    });
  }

  async fetch(
    sessionId: string,
    url: RequestInfo,
    init?: RequestInit
  ): Promise<Response> {
    const credentials: IRequestCredentials = {
      localUserId: sessionId,
      // TODO: This should not be hard-coded
      type: "dpop"
    };
    return this.authenticatedFetcher.handle(credentials, url, init);
  }

  async logout(sessionId: string): Promise<void> {
    this.logoutHandler.handle(sessionId);
  }

  async getSessionInfo(sessionId: string): Promise<ISessionInfo | undefined> {
    // TODO complete
    return this.sessionInfoManager.get(sessionId);
  }

  async getAllSessionInfo(): Promise<ISessionInfo[]> {
    return this.sessionInfoManager.getAll();
  }

  async handleIncomingRedirect(url: string): Promise<ISessionInfo | undefined> {
    return this.redirectHandler.handle(url);
  }
}
