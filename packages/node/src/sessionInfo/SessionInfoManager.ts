//
// Copyright Inrupt Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
// Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

/**
 * @hidden
 * @packageDocumentation
 */

import type {
  ISessionInfo,
  ISessionInternalInfo,
  ISessionInfoManager,
  AuthorizationRequestState,
} from "@inrupt/solid-client-authn-core";
import { SessionInfoManagerBase } from "@inrupt/solid-client-authn-core";
import { KEY_REGISTERED_SESSIONS } from "../constant";

export {
  getUnauthenticatedSession,
  clear,
} from "@inrupt/solid-client-authn-core";

/**
 * @hidden
 */
export class SessionInfoManager
  extends SessionInfoManagerBase
  implements ISessionInfoManager
{
  /**
   * Sets session information in storage.
   * @param sessionId The ID of the session to update
   * @param sessionInfo The session information to store
   */
  async set(
    sessionId: string,
    sessionInfo: Partial<ISessionInfo & ISessionInternalInfo>,
  ): Promise<void> {
    const fieldsToStore = {
      // ISessionInfo fields
      webId: sessionInfo.webId,
      isLoggedIn: sessionInfo.isLoggedIn,
      clientAppId: sessionInfo.clientAppId,
      expirationDate: sessionInfo.expirationDate,
      // ISessionInternalInfo fields
      refreshToken: sessionInfo.refreshToken,
      issuer: sessionInfo.issuer,
      redirectUrl: sessionInfo.redirectUrl,
      clientAppSecret: sessionInfo.clientAppSecret,
      dpop: sessionInfo.tokenType === "DPoP",
      keepAlive: sessionInfo.keepAlive,
      privateKey: sessionInfo.privateKey,
      publicKey: sessionInfo.publicKey,
    };

    const definedFields: Record<string, string> = Object.entries(fieldsToStore)
      .filter(
        (entry): entry is [string, string | boolean | number] =>
          entry[1] !== undefined,
      )
      .reduce(
        (prev, cur) => ({ ...prev, [`${cur[0]}`]: cur[1].toString() }),
        {},
      );
    await this.storageUtility.setForUser(sessionId, definedFields);
  }

  async get(
    sessionId: string,
  ): Promise<(ISessionInfo & ISessionInternalInfo) | undefined> {
    const [
      webId,
      isLoggedIn,
      clientAppId,
      expirationDate,
      refreshToken,
      issuer,
      redirectUrl,
      clientAppSecret,
      dpop,
      keepAlive,
      publicKey,
      privateKey,
    ] = await Promise.all([
      // ISessionInfo
      this.storageUtility.getForUser(sessionId, "webId"),
      this.storageUtility.getForUser(sessionId, "isLoggedIn"),
      this.storageUtility.getForUser(sessionId, "clientAppId"),
      this.storageUtility.getForUser(sessionId, "expirationDate"),
      // ISessionInternalInfo
      this.storageUtility.getForUser(sessionId, "refreshToken"),
      this.storageUtility.getForUser(sessionId, "issuer"),
      this.storageUtility.getForUser(sessionId, "redirectUrl"),
      this.storageUtility.getForUser(sessionId, "clientAppSecret"),
      this.storageUtility.getForUser(sessionId, "dpop"),
      this.storageUtility.getForUser(sessionId, "keepAlive"),
      this.storageUtility.getForUser(sessionId, "publicKey"),
      this.storageUtility.getForUser(sessionId, "privateKey"),
    ]);

    if (issuer !== undefined) {
      return {
        // ISessionInfo
        sessionId,
        webId,
        isLoggedIn: isLoggedIn === "true",
        clientAppId,
        expirationDate: expirationDate
          ? Number.parseInt(expirationDate, 10)
          : undefined,
        // ISessionInternalInfo
        refreshToken,
        issuer,
        clientAppSecret,
        redirectUrl,
        tokenType: dpop === "true" ? "DPoP" : "Bearer",
        keepAlive: keepAlive === "true",
        publicKey,
        privateKey,
      };
    }

    return undefined;
  }

  /**
   * This function removes all session-related information from storage.
   * @param sessionId the session identifier
   * @hidden
   */
  async clear(sessionId: string): Promise<void> {
    const rawSessions = await this.storageUtility.get(KEY_REGISTERED_SESSIONS);
    if (rawSessions !== undefined) {
      const sessions: string[] = JSON.parse(rawSessions);
      await this.storageUtility.set(
        KEY_REGISTERED_SESSIONS,
        JSON.stringify(
          sessions.filter((storedSessionId) => storedSessionId !== sessionId),
        ),
      );
    }
    return super.clear(sessionId);
  }

  /**
   * Registers a new session, so that its ID can be retrieved.
   * @param sessionId
   */
  async register(sessionId: string): Promise<void> {
    const rawSessions = await this.storageUtility.get(KEY_REGISTERED_SESSIONS);
    if (rawSessions === undefined) {
      return this.storageUtility.set(
        KEY_REGISTERED_SESSIONS,
        JSON.stringify([sessionId]),
      );
    }
    const sessions: string[] = JSON.parse(rawSessions);
    if (!sessions.includes(sessionId)) {
      sessions.push(sessionId);
      return this.storageUtility.set(
        KEY_REGISTERED_SESSIONS,
        JSON.stringify(sessions),
      );
    }
    return Promise.resolve();
  }

  /**
   * Returns all the registered session IDs. Differs from getAll, which also
   * returns additional session information.
   */
  async getRegisteredSessionIdAll(): Promise<string[]> {
    return this.storageUtility.get(KEY_REGISTERED_SESSIONS).then((data) => {
      if (data === undefined) {
        return [];
      }
      return JSON.parse(data);
    });
  }

  /**
   * Deletes all information about all sessions, including their registrations.
   */
  async clearAll(): Promise<void> {
    const rawSessions = await this.storageUtility.get(KEY_REGISTERED_SESSIONS);
    if (rawSessions === undefined) {
      return Promise.resolve();
    }
    const sessions: string[] = JSON.parse(rawSessions);
    await Promise.all(sessions.map((sessionId) => this.clear(sessionId)));
    return this.storageUtility.set(KEY_REGISTERED_SESSIONS, JSON.stringify([]));
  }

  /**
   * Sets authorization request state in storage for a given session ID.
   */
  async setOidcContext(
    sessionId: string,
    authorizationRequestState: AuthorizationRequestState & {
      keepAlive: false;
      clientType: "solid-oidc";
    },
  ): Promise<void> {
    // First, store mapping from state to sessionId (for the IdP redirect back)
    await this.storageUtility.setForUser(authorizationRequestState.state, {
      sessionId,
    });

    // Then, store all the auth state information in the session storage
    const infoToStore: Record<string, string> = {
      codeVerifier: authorizationRequestState.codeVerifier,
      issuer: authorizationRequestState.issuer,
      redirectUrl: authorizationRequestState.redirectUrl,
      dpop: authorizationRequestState.dpopBound.toString(),
      keepAlive: authorizationRequestState.keepAlive.toString(),
      clientId: authorizationRequestState.clientId,
      clientType: authorizationRequestState.clientType,
    };
    await this.storageUtility.setForUser(sessionId, infoToStore);
  }
}
