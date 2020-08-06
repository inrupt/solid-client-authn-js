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

import IStorage from "./storage/IStorage";
import ILoginInputOptions from "./ILoginInputOptions";
import { EventEmitter } from "events";
import ISessionInfo from "./sessionInfo/ISessionInfo";
import ClientAuthentication from "./ClientAuthentication";
import { getClientAuthenticationWithDependencies } from "./dependencies";
import { v4 } from "uuid";

export interface ISessionOptions {
  secureStorage: IStorage;
  insecureStorage: IStorage;
  sessionInfo: ISessionInfo;
  clientAuthentication: ClientAuthentication;
}

export class Session extends EventEmitter {
  public readonly info: ISessionInfo;
  private clientAuthentication: ClientAuthentication;

  constructor(
    sessionOptions: Partial<ISessionOptions> = {},
    sessionId?: string
  ) {
    super();
    if (sessionOptions.clientAuthentication) {
      this.clientAuthentication = sessionOptions.clientAuthentication;
    } else if (sessionOptions.secureStorage && sessionOptions.insecureStorage) {
      this.clientAuthentication = getClientAuthenticationWithDependencies({
        secureStorage: sessionOptions.secureStorage,
        insecureStorage: sessionOptions.insecureStorage
      });
    } else {
      throw new Error(
        "Session requires either storage options or auth fetcher."
      );
    }
    if (sessionOptions.sessionInfo) {
      this.info = {
        sessionId: sessionOptions.sessionInfo.sessionId,
        isLoggedIn: sessionOptions.sessionInfo.isLoggedIn,
        webId: sessionOptions.sessionInfo.webId
      };
    } else {
      this.info = {
        sessionId: sessionId ?? v4(),
        isLoggedIn: false
      };
    }
  }

  // Define these functions as properties so that they don't get accidentally re-bound.
  // Isn't Javascript fun?
  login = async (options: ILoginInputOptions): Promise<void> => {
    await this.clientAuthentication.login(this.info.sessionId, {
      ...options
    });
    this.emit("login");
  };

  fetch = async (url: RequestInfo, init?: RequestInit): Promise<Response> => {
    return this.clientAuthentication.fetch(this.info.sessionId, url, init);
  };

  logout = async (): Promise<void> => {
    await this.clientAuthentication.logout(this.info.sessionId);
    this.emit("logout");
  };

  handleIncomingRedirect = async (
    url: string
  ): Promise<ISessionInfo | undefined> => {
    const sessionInfo = await this.clientAuthentication.handleIncomingRedirect(
      url
    );
    if (sessionInfo) {
      this.info.isLoggedIn = sessionInfo.isLoggedIn;
      this.info.webId = sessionInfo.webId;
    }
    return sessionInfo;
  };

  onLogin(callback: () => unknown): void {
    this.on("login", callback);
  }

  onLogout(callback: () => unknown): void {
    this.on("logout", callback);
  }
}
