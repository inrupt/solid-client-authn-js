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
import AuthFetcher from "./AuthFetcher";
import getAuthFetcherWithDependencies from "./dependencies";
import { v4 } from "uuid";

export interface ISessionOptions {
  secureStorage: IStorage;
  insecureStorage: IStorage;
  sessionInfo: ISessionInfo;
  authFetcher: AuthFetcher;
}

export class Session extends EventEmitter {
  public readonly sessionId: string;
  public isLoggedIn: boolean;
  public webId?: string;
  private authFetcher: AuthFetcher;

  constructor(
    sessionOptions: Partial<ISessionOptions> = {},
    sessionId?: string
  ) {
    super();
    if (sessionOptions.authFetcher) {
      this.authFetcher = sessionOptions.authFetcher;
    } else if (sessionOptions.secureStorage && sessionOptions.insecureStorage) {
      this.authFetcher = getAuthFetcherWithDependencies({
        secureStorage: sessionOptions.secureStorage,
        insecureStorage: sessionOptions.insecureStorage
      });
    } else {
      throw new Error(
        "Session requires either storage options or auth fetcher."
      );
    }
    if (sessionOptions.sessionInfo) {
      this.sessionId = sessionOptions.sessionInfo.sessionId;
      this.isLoggedIn = sessionOptions.sessionInfo.isLoggedIn;
      this.webId = sessionOptions.sessionInfo.webId;
    } else {
      if (sessionId) {
        this.sessionId = sessionId;
      } else {
        this.sessionId = v4();
      }
      this.isLoggedIn = false;
    }
  }

  async init(): Promise<void> {
    throw new Error("Not Implemented");
  }

  async login(options: ILoginInputOptions): Promise<void> {
    this.authFetcher.login(this.sessionId, {
      ...options
    });
    this.emit("login");
  }

  async fetch(url: RequestInfo, init?: RequestInit): Promise<Response> {
    return this.authFetcher.fetch(this.sessionId, url, init);
  }

  async logout(): Promise<void> {
    await this.authFetcher.logout(this.sessionId);
    this.emit("logout");
  }

  async handleIncomingRedirect(url: string): Promise<ISessionInfo | undefined> {
    console.log(`Incoming redirect: ${url}`);
    const sessionInfo = await this.authFetcher.handleIncomingRedirect(url);
    if (sessionInfo) {
      this.isLoggedIn = sessionInfo.isLoggedIn;
      this.webId = sessionInfo.webId;
    }
    return sessionInfo;
  }

  onLogin(callback: () => unknown): void {
    this.on("login", callback);
  }

  onLogout(callback: () => unknown): void {
    this.on("logout", callback);
  }
}
