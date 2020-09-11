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

/**
 * @hidden
 * @packageDocumentation
 */

import { injectable, inject } from "tsyringe";
import { IEnvironmentDetector } from "./util/EnvironmentDetector";
import {
  ILoginInputOptions,
  ILoginHandler,
  ILogoutHandler,
  IAuthenticatedFetcher,
  IRedirectHandler,
  IRequestCredentials,
  ISessionInfo,
  ISessionInfoManager,
} from "@inrupt/solid-client-authn-core";
import URL from "url-parse";

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

  // Define these functions as properties so that they don't get accidentally re-bound.
  // Isn't Javascript fun?
  login = async (
    sessionId: string,
    options: ILoginInputOptions
  ): Promise<void> => {
    // In order to get a clean start, make sure that the session is logged out on login.
    await this.sessionInfoManager.clear(sessionId);
    return this.loginHandler.handle({
      sessionId,
      oidcIssuer: this.urlOptionToUrl(options.oidcIssuer),
      redirectUrl: this.urlOptionToUrl(options.redirectUrl),
      clientId: options.clientId,
      clientSecret: options.clientSecret,
      clientName: options.clientId,
      popUp: options.popUp || false,
      handleRedirect: options.handleRedirect,
    });
  };

  fetch = async (
    sessionId: string,
    url: RequestInfo,
    init?: RequestInit
  ): Promise<Response> => {
    const credentials: IRequestCredentials = {
      localUserId: sessionId,
      // TODO: This should not be hard-coded
      type: "dpop",
    };
    return this.authenticatedFetcher.handle(credentials, url, init);
  };

  logout = async (sessionId: string): Promise<void> => {
    this.logoutHandler.handle(sessionId);
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
    return this.redirectHandler.handle(url);
  };
}
