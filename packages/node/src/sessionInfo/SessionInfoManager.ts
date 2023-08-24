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
  async get(
    sessionId: string,
  ): Promise<(ISessionInfo & ISessionInternalInfo) | undefined> {
    const webId = await this.storageUtility.getForUser(sessionId, "webId");
    const isLoggedIn = await this.storageUtility.getForUser(
      sessionId,
      "isLoggedIn",
    );
    const refreshToken = await this.storageUtility.getForUser(
      sessionId,
      "refreshToken",
    );
    const issuer = await this.storageUtility.getForUser(sessionId, "issuer");

    if (issuer !== undefined) {
      return {
        sessionId,
        webId,
        isLoggedIn: isLoggedIn === "true",
        refreshToken,
        issuer,
      };
    }

    return undefined;
  }

  /**
   * This function removes all session-related information from storage.
   * @param sessionId the session identifier
   * @param storage the storage where session info is stored
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
}
