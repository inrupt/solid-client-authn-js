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
import { Session } from "./Session";
import { EventEmitter } from "events";
import ClientAuthentication from "./ClientAuthentication";
import { getClientAuthenticationWithDependencies } from "./dependencies";
import { detectEnvironment } from "./util/EnvironmentDetector";
import ISessionInfo from "./sessionInfo/ISessionInfo";

export interface ISessionManagerOptions {
  secureStorage?: IStorage;
  insecureStorage?: IStorage;
}

export class SessionManager extends EventEmitter {
  private clientAuthn: ClientAuthentication;
  private sessionRecords: Record<
    string,
    { session: Session; logoutCallback: () => unknown }
  > = {};
  private isInitialized = false;
  private handledIncomingRedirect = false;

  constructor(options: ISessionManagerOptions = {}) {
    super();
    this.clientAuthn = getClientAuthenticationWithDependencies({
      secureStorage: options.secureStorage,
      insecureStorage: options.insecureStorage
    });
  }

  private async init(): Promise<void> {
    if (!this.isInitialized) {
      const env = detectEnvironment();
      if (env === "browser") {
        await this.handleIncomingRedirect(window.location.href);
      }
      this.isInitialized = true;
    }
  }

  private addNewSessionRecord(session: Session): Session {
    const logoutCallback = (): void => {
      this.emit("sessionLogout", session);
    };
    session.onLogout(logoutCallback);
    this.sessionRecords[session.info.sessionId] = {
      session,
      logoutCallback
    };
    return session;
  }

  private getSessionFromCurrentSessionInfo(sessionInfo: ISessionInfo): Session {
    const sessionRecord = this.sessionRecords[sessionInfo.sessionId];
    if (sessionRecord) {
      sessionRecord.session.info.webId = sessionInfo.webId;
      sessionRecord.session.info.isLoggedIn = sessionInfo.isLoggedIn;
      return sessionRecord.session;
    } else {
      return this.addNewSessionRecord(
        new Session({
          clientAuthentication: this.clientAuthn,
          sessionInfo: sessionInfo
        })
      );
    }
  }

  async getSessions(): Promise<Session[]> {
    await this.init();
    const sessionInfos = await this.clientAuthn.getAllSessionInfo();
    return sessionInfos.map(sessionInfo =>
      this.getSessionFromCurrentSessionInfo(sessionInfo)
    );
  }

  async getSession(sessionId?: string): Promise<Session> {
    await this.init();
    let session: Session;
    if (sessionId) {
      const retrievedSessionInfo = await this.clientAuthn.getSessionInfo(
        sessionId
      );
      if (retrievedSessionInfo) {
        session = this.getSessionFromCurrentSessionInfo(retrievedSessionInfo);
      } else {
        session = this.addNewSessionRecord(
          new Session({ clientAuthentication: this.clientAuthn }, sessionId)
        );
      }
    } else {
      session = this.addNewSessionRecord(
        new Session({ clientAuthentication: this.clientAuthn })
      );
    }
    return session;
  }

  async hasSession(sessionId: string): Promise<boolean> {
    await this.init();
    return (await this.clientAuthn.getSessionInfo(sessionId)) !== undefined;
  }

  onSessionLogin(callback: (session: Session) => unknown): void {
    this.on("sessionLogin", callback);
  }

  onSessionLogout(callback: (session: Session) => unknown): void {
    this.on("sessionLogin", callback);
  }

  detatchSession(sessionId: string): void {
    const sessionRecord = this.sessionRecords[sessionId];
    if (sessionRecord) {
      sessionRecord.session.removeListener(
        "onLogout",
        sessionRecord.logoutCallback
      );
      delete this.sessionRecords[sessionId];
    }
  }

  async handleIncomingRedirect(url: string): Promise<void> {
    if (!this.handledIncomingRedirect) {
      // This will always cause the user to log in. If not it will throw an error.
      const sessionInfo = await this.clientAuthn.handleIncomingRedirect(url);
      if (sessionInfo) {
        const session = this.getSessionFromCurrentSessionInfo(sessionInfo);
        this.emit("sessionLogin", session);
        session.emit("login");
        this.handledIncomingRedirect = true;
      }
    }
  }
}
