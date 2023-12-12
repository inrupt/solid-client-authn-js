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

import { v4 } from "uuid";
import type {
  ISessionInfo,
  ISessionInfoManager,
  ISessionInternalInfo,
  ISessionInfoManagerOptions,
  IStorageUtility,
} from "..";

export function getUnauthenticatedSession(): ISessionInfo & {
  fetch: typeof fetch;
} {
  return {
    isLoggedIn: false,
    sessionId: v4(),
    fetch: (...args) => fetch(...args),
  };
}

/**
 * @param sessionId
 * @param storage
 * @hidden
 */
export async function clear(
  sessionId: string,
  storage: IStorageUtility,
): Promise<void> {
  await Promise.all([
    storage.deleteAllUserData(sessionId, { secure: false }),
    storage.deleteAllUserData(sessionId, { secure: true }),
  ]);
}

/**
 * @hidden
 */
export abstract class SessionInfoManagerBase implements ISessionInfoManager {
  constructor(protected storageUtility: IStorageUtility) {
    this.storageUtility = storageUtility;
  }

  update(
    _sessionId: string,
    _options: ISessionInfoManagerOptions,
  ): Promise<void> {
    throw new Error("Not Implemented");
  }

  get(_: string): Promise<(ISessionInfo & ISessionInternalInfo) | undefined> {
    throw new Error("Not implemented");
  }

  // eslint-disable-next-line class-methods-use-this
  async getAll(): Promise<(ISessionInfo & ISessionInternalInfo)[]> {
    throw new Error("Not implemented");
  }

  /**
   * This function removes all session-related information from storage.
   * @param sessionId the session identifier
   * @param storage the storage where session info is stored
   * @hidden
   */
  async clear(sessionId: string): Promise<void> {
    return clear(sessionId, this.storageUtility);
  }

  /**
   * Registers a new session, so that its ID can be retrieved.
   * @param sessionId
   */
  async register(_sessionId: string): Promise<void> {
    throw new Error("Not implemented");
  }

  /**
   * Returns all the registered session IDs. Differs from getAll, which also
   * returns additional session information.
   */
  async getRegisteredSessionIdAll(): Promise<string[]> {
    throw new Error("Not implemented");
  }

  /**
   * Deletes all information about all sessions, including their registrations.
   */
  async clearAll(): Promise<void> {
    throw new Error("Not implemented");
  }
}
