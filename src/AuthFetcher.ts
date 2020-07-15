/**
 * This project is a continuation of Inrupt's awesome solid-auth-fetcher project,
 * see https://www.npmjs.com/package/@inrupt/solid-auth-fetcher.
 * Copyright 2020 The Solid Project.
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

import ISolidSession from "./solidSession/ISolidSession";
import ILoginInputOptions, {
  loginInputOptionsSchema
} from "./ILoginInputOptions";
import { injectable, inject } from "tsyringe";
import ILoginHandler from "./login/ILoginHandler";
import ILoginOptions from "./login/ILoginOptions";
import validateSchema from "./util/validateSchema";
import IRedirectHandler from "./login/oidc/redirectHandler/IRedirectHandler";
import ILogoutHandler from "./logout/ILogoutHandler";
import { ISessionCreator } from "./solidSession/SessionCreator";
import IAuthenticatedFetcher from "./authenticatedFetch/IAuthenticatedFetcher";
import { IEnvironmentDetector } from "./util/EnvironmentDetector";
import { EventEmitter } from "events";

@injectable()
export default class AuthFetcher extends EventEmitter {
  private globalUserName = "global";
  constructor(
    @inject("loginHandler") private loginHandler: ILoginHandler,
    @inject("redirectHandler") private redirectHandler: IRedirectHandler,
    @inject("logoutHandler") private logoutHandler: ILogoutHandler,
    @inject("sessionCreator") private sessionCreator: ISessionCreator,
    @inject("authenticatedFetcher")
    private authenticatedFetcher: IAuthenticatedFetcher,
    @inject("environmentDetector")
    private environmentDetector: IEnvironmentDetector
  ) {
    super();
  }

  private async loginHelper(
    options: ILoginInputOptions,
    localUserId?: string
  ): Promise<ISolidSession> {
    const internalOptions: ILoginOptions = validateSchema(
      loginInputOptionsSchema,
      options
    );
    if (localUserId) {
      internalOptions.localUserId = localUserId;
    }
    return this.loginHandler.handle(internalOptions);
  }

  async login(options: ILoginInputOptions): Promise<ISolidSession> {
    return this.loginHelper(options, this.globalUserName);
  }

  async fetch(url: RequestInfo, init?: RequestInit): Promise<Response> {
    this.emit("request", url, init);
    return this.authenticatedFetcher.handle(
      // TODO: generate request credentials separately
      {
        localUserId: this.globalUserName,
        type: "dpop"
      },
      url,
      init
    );
  }

  async logout(): Promise<void> {
    await this.logoutHandler.handle(this.globalUserName);
  }

  async getSession(): Promise<ISolidSession | null> {
    return this.sessionCreator.getSession(this.globalUserName);
  }

  async uniqueLogin(options: ILoginInputOptions): Promise<ISolidSession> {
    return this.loginHelper(options);
  }

  async onSession(
    callback: (session: ISolidSession) => unknown
  ): Promise<void> {
    // TODO: this should be updated to handle non global as well
    const currentSession = await this.getSession();
    if (currentSession) {
      callback(currentSession);
    }
    this.on("session", callback);
  }

  async onLogout(callback: (session: ISolidSession) => unknown): Promise<void> {
    throw new Error("Not Implemented");
  }

  async onRequest(
    callback: (RequestInfo: RequestInfo, requestInit: RequestInit) => unknown
  ): Promise<void> {
    this.on("request", callback);
  }

  async handleRedirect(url: string): Promise<ISolidSession> {
    const session = await this.redirectHandler.handle(url);
    this.emit("session", session);
    return session;
  }

  async automaticallyHandleRedirect(): Promise<void> {
    if (this.environmentDetector.detect() === "browser") {
      await this.handleRedirect(window.location.href);
    }
  }

  customAuthFetcher(options: {}): unknown {
    throw new Error("Not Implemented");
  }
}
