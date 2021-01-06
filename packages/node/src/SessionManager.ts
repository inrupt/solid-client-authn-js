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

import { EventEmitter } from "events";
import { ISessionInfo, IStorage } from "@inrupt/solid-client-authn-core";
import { injectable } from "tsyringe";
import { Session } from "./Session";
import ClientAuthentication from "./ClientAuthentication";
import { getClientAuthenticationWithDependencies } from "./dependencies";

export interface ISessionManagerOptions {
  secureStorage?: IStorage;
  insecureStorage?: IStorage;
}

export interface ISessionManager {
  getSession(sessionId?: string): Promise<Session>;
}

/**
 * A SessionManager instance can be used to manage all the sessions in an
 * application, each session being associated with an individual user.
 */
@injectable()
export class SessionManager extends EventEmitter implements ISessionManager {
  private clientAuthn: ClientAuthentication;

  private sessionRecords: Record<
    string,
    { session: Session; logoutCallback: () => unknown }
  > = {};

  private isInitialized = false;

  private handledIncomingRedirect = false;

  /**
   * Constructor for the SessionManager object. It is typically used as follows:
   *
   * ```typescript
   * import { SessionManager } from "@inrupt/solid-client-authn-browser";
   * import customStorage from "./myCustomStorage";
   *
   * const sessionManager = new SessionManager({
   *   secureStorage: customStorage
   * });
   * ```
   * See {@link IStorage} for more information on how to define your own storage mechanism.
   *
   * @param options Options customizing the behaviour of the SessionManager, namely to store data appropriately.
   */
  constructor(options: ISessionManagerOptions = {}) {
    super();
    this.clientAuthn = getClientAuthenticationWithDependencies({
      secureStorage: options.secureStorage,
      insecureStorage: options.insecureStorage,
    });
  }

  private addNewSessionRecord(session: Session): Session {
    const logoutCallback = (): void => {
      this.emit("sessionLogout", session);
    };
    session.onLogout(logoutCallback);
    this.sessionRecords[session.info.sessionId] = {
      session,
      logoutCallback,
    };
    return session;
  }

  private getSessionFromCurrentSessionInfo(sessionInfo: ISessionInfo): Session {
    const sessionRecord = this.sessionRecords[sessionInfo.sessionId];
    if (sessionRecord) {
      sessionRecord.session.info.webId = sessionInfo.webId;
      sessionRecord.session.info.isLoggedIn = sessionInfo.isLoggedIn;
      return sessionRecord.session;
    }
    return this.addNewSessionRecord(
      new Session({
        clientAuthentication: this.clientAuthn,
        sessionInfo,
      })
    );
  }

  /**
   * @returns all the sessions currently managed by the session manager.
   */
  async getSessions(): Promise<Session[]> {
    const sessionInfos = await this.clientAuthn.getAllSessionInfo();
    return sessionInfos.map((sessionInfo) =>
      this.getSessionFromCurrentSessionInfo(sessionInfo)
    );
  }

  /**
   * Creates a new session and adds it to the session manager.
   * If a session ID is not provided then a random UUID will be
   * assigned as the session ID. If the session of the provided
   * ID already exists then that session will be returned.
   *
   * @param sessionId An optional unique session identifier.
   * @returns A {@link Session} associated to the given ID.
   */
  async getSession(sessionId?: string): Promise<Session> {
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

  /**
   * @param sessionId A unique session identifier.
   * @returns A Promise resolving to true if a session associated to the given ID exists, and false if not.
   */
  async hasSession(sessionId: string): Promise<boolean> {
    return (await this.clientAuthn.getSessionInfo(sessionId)) !== undefined;
  }

  /**
   * Registers a callback to be called when a session is logged in.
   *
   * @param callback a function executed when a session logs in, with the session as a parameter.
   */
  onSessionLogin(callback: (session: Session) => unknown): void {
    this.on("sessionLogin", callback);
  }

  /**
   * Registers a callback to be called when a session is logged out.
   *
   * @param callback a function executed when a session logs out, with the session as a parameter.
   */
  onSessionLogout(callback: (session: Session) => unknown): void {
    this.on("sessionLogout", callback);
  }

  /**
   * Removes a session from the pool managed by the manager. This is typically useful
   * when a user logs out of the application, so that the number of managed session
   * is not ever-growing. Note that this specific function **does not log out the session**,
   * it only removes references to it, so after this call the session will become unreachable.
   *
   * @param sessionId A unique session identifier.
   * @since 0.2.0
   */
  detachSession(sessionId: string): void {
    const sessionRecord = this.sessionRecords[sessionId];
    if (sessionRecord) {
      sessionRecord.session.removeListener(
        "onLogout",
        sessionRecord.logoutCallback
      );
      delete this.sessionRecords[sessionId];
    }
  }

  /**
   * Processes the information sent by the identity provider after
   * the user has logged in, in order to return a logged in {@link Session}.
   *
   * @param url The URL to which the user is being redirected.
   * @returns The {@link Session} that completed login if the process has been successful.
   */
  async handleIncomingRedirect(url: string): Promise<Session | undefined> {
    const sessionInfo = await this.clientAuthn.handleIncomingRedirect(url);
    if (sessionInfo) {
      const session = this.getSessionFromCurrentSessionInfo(sessionInfo);
      this.emit("sessionLogin", session);
      session.emit("login");
      return session;
    }
    return undefined;
  }
}
