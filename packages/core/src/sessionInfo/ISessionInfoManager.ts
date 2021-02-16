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

/**
 * @hidden
 * @packageDocumentation
 */

import { ISessionInfo, ISessionInternalInfo } from "./ISessionInfo";

/**
 * @hidden
 */
export interface ISessionInfoManagerOptions {
  loggedIn?: boolean;
  webId?: string;
}

/**
 * @hidden
 */
export interface ISessionInfoManager {
  update(sessionId: string, options: ISessionInfoManagerOptions): Promise<void>;
  /**
   * Returns all information about a registered session
   * @param sessionId
   */
  get(
    sessionId: string
  ): Promise<(ISessionInfo & ISessionInternalInfo) | undefined>;
  /**
   * Returns all information about all registered sessions
   */
  getAll(): Promise<(ISessionInfo & ISessionInternalInfo)[]>;
  /**
   * Registers a new session, so that its ID can be retrieved.
   * @param sessionId
   */
  register(sessionId: string): Promise<void>;
  /**
   * Returns all the registered session IDs. Differs from getAll, which also
   * returns additional session information.
   */
  getRegisteredSessionIdAll(): Promise<string[]>;
  /**
   * Deletes all information regarding one session, including its registration.
   * @param sessionId
   */
  clear(sessionId: string): Promise<void>;
  /**
   * Deletes all information about all sessions, including their registrations.
   */
  clearAll(): Promise<void>;
}

export const USER_SESSION_PREFIX = "solidClientAuthenticationUser";
