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

import { EVENTS, type IStorage } from "@inrupt/solid-client-authn-core";
import type ClientAuthentication from "./ClientAuthentication";
import { getClientAuthenticationWithDependencies } from "./dependencies";
import { defaultStorage, Session } from "./Session";

export type GetSessionOptions = Partial<{
  storage: IStorage;
  onNewRefreshToken: (newToken: string) => unknown;
  refreshSession: boolean;
}>;

function isSessionOptions(input: unknown): input is GetSessionOptions {
  if (typeof input !== "object" || input === null) {
    return false;
  }
  const storageType = typeof (input as GetSessionOptions).storage;
  const callbackType = typeof (input as GetSessionOptions).onNewRefreshToken;
  const refreshType = typeof (input as GetSessionOptions).refreshSession;
  return (
    (storageType === "undefined" || storageType === "object") &&
    (callbackType === "undefined" || callbackType === "function") &&
    (refreshType === "undefined" || refreshType === "boolean")
  );
}

export async function refreshSession(
  session: Session,
  options?: { storage?: IStorage },
): Promise<void> {
  const clientAuth: ClientAuthentication =
    options?.storage !== undefined
      ? getClientAuthenticationWithDependencies({
          secureStorage: options.storage,
          insecureStorage: options.storage,
        })
      : getClientAuthenticationWithDependencies({
          secureStorage: defaultStorage,
          insecureStorage: defaultStorage,
        });
  const sessionInfo = await clientAuth.getSessionInfo(session.info.sessionId);
  if (sessionInfo !== undefined && sessionInfo.refreshToken) {
    await session.login({
      oidcIssuer: sessionInfo.issuer,
      tokenType: sessionInfo.tokenType,
    });
  }
}

async function internalGetSessionFromStorage(
  sessionId: string,
  options?: GetSessionOptions,
): Promise<Session | undefined> {
  const {
    storage,
    onNewRefreshToken,
    refreshSession: refresh,
  } = options ?? { refreshSession: true };
  const clientAuth: ClientAuthentication = storage
    ? getClientAuthenticationWithDependencies({
        secureStorage: storage,
        insecureStorage: storage,
      })
    : getClientAuthenticationWithDependencies({
        secureStorage: defaultStorage,
        insecureStorage: defaultStorage,
      });
  const sessionInfo = await clientAuth.getSessionInfo(sessionId);
  if (sessionInfo === undefined) {
    return undefined;
  }
  const session = new Session({
    sessionInfo,
    clientAuthentication: clientAuth,
    keepAlive: sessionInfo.keepAlive,
  });
  if (onNewRefreshToken !== undefined) {
    session.events.on(EVENTS.NEW_REFRESH_TOKEN, onNewRefreshToken);
  }
  if (refresh ?? true) {
    await refreshSession(session, { storage: storage ?? defaultStorage });
  }
  return session;
}

/**
 * Retrieve a Session from the given storage based on its session ID. If possible,
 * the Session is logged in before it is returned, so that `session.fetch` may
 * access private Resource without any additional interaction.
 *
 * If no storage is provided, a default in-memory storage will be used. It is
 * instanciated once on load, and is shared across all the sessions. Since it
 * is only available in memory, the storage is lost when the code stops running.
 *
 * A Session is available in storage as soon as it logged in once, and it is removed
 * from storage on logout.
 *
 * @param sessionId The ID of the Session to retrieve
 * @param storage The storage where the Session can be found
 * @param onNewRefreshToken A callback to call on refresh token rotation
 * @returns A session object, authenticated if possible, or undefined if no Session
 * in storage matches the given ID.
 */
export async function getSessionFromStorage(
  sessionId: string,
  storage?: IStorage,
  onNewRefreshToken?: (newToken: string) => unknown,
  refresh?: boolean,
): Promise<Session | undefined>;
/**
 * Retrieve a Session from the given storage based on its session ID. If possible,
 * the Session is logged in before it is returned, so that `session.fetch` may
 * access private Resource without any additional interaction.
 *
 * If no storage is provided, a default in-memory storage will be used. It is
 * instanciated once on load, and is shared across all the sessions. Since it
 * is only available in memory, the storage is lost when the code stops running.
 *
 * A Session is available in storage as soon as it logged in once, and it is removed
 * from storage on logout.
 *
 * @param sessionId The ID of the Session to retrieve
 * @param storage The storage where the Session can be found
 * @param onNewRefreshToken A callback to call on refresh token rotation
 * @returns A session object, authenticated if possible, or undefined if no Session
 * in storage matches the given ID.
 */
export async function getSessionFromStorage(
  sessionId: string,
  options?: GetSessionOptions,
): Promise<Session | undefined>;
/**
 * Retrieve a Session from the given storage based on its session ID. If possible,
 * the Session is logged in before it is returned, so that `session.fetch` may
 * access private Resource without any additional interaction.
 *
 * If no storage is provided, a default in-memory storage will be used. It is
 * instanciated once on load, and is shared across all the sessions. Since it
 * is only available in memory, the storage is lost when the code stops running.
 *
 * A Session is available in storage as soon as it logged in once, and it is removed
 * from storage on logout.
 *
 * @param sessionId The ID of the Session to retrieve
 * @param storage The storage where the Session can be found
 * @returns A session object, authenticated if possible, or undefined if no Session
 * in storage matches the given ID.
 */
export async function getSessionFromStorage(
  sessionId: string,
  storageOrOptions?: IStorage | GetSessionOptions,
  onNewRefreshToken?: (newToken: string) => unknown,
  refresh: boolean = true,
): Promise<Session | undefined> {
  if (isSessionOptions(storageOrOptions)) {
    return internalGetSessionFromStorage(sessionId, storageOrOptions);
  }
  // Support the legacy signature.
  return internalGetSessionFromStorage(sessionId, {
    storage: storageOrOptions,
    onNewRefreshToken,
    refreshSession: refresh,
  });
}

/**
 * Retrieve the IDs for all the Sessions available in the given storage. Note that
 * it is only the Session IDs that are returned, and not Session object. Given a
 * Session ID, one may use [[getSessionFromStorage]] to get the actual Session
 * object, while being conscious that logging in a Session required an HTTP
 * interaction, so doing it in batch for a large number of sessions may result
 * in performance issues.
 *
 * If no storage is provided, a default in-memory storage will be used. It is
 * instanciated once on load, and is shared across all the sessions. Since it
 * is only available in memory, the storage is lost when the code stops running.
 *
 * A Session is available in storage as soon as it logged in once, and it is removed
 * from storage on logout.
 *
 * @param storage The storage where the Session can be found
 * @returns An array of Session IDs
 */
export async function getSessionIdFromStorageAll(
  storage?: IStorage,
): Promise<string[]> {
  const clientAuth: ClientAuthentication = storage
    ? getClientAuthenticationWithDependencies({
        secureStorage: storage,
        insecureStorage: storage,
      })
    : getClientAuthenticationWithDependencies({
        secureStorage: defaultStorage,
        insecureStorage: defaultStorage,
      });
  return clientAuth.getSessionIdAll();
}

/**
 * Clear the given storage from any existing Session ID. In order to remove an
 * individual Session from storage, rather than going through this batch deletion,
 * one may simply log the Session out calling `session.logout`.
 *
 * If no storage is provided, a default in-memory storage will be used. It is
 * instanciated once on load, and is shared across all the sessions. Since it
 * is only available in memory, the storage is lost when the code stops running.
 *
 * A Session is available in storage as soon as it logged in once, and it is removed
 * from storage on logout.
 *
 * @param storage The storage where the Session can be found
 */
export async function clearSessionFromStorageAll(
  storage?: IStorage,
): Promise<void> {
  const clientAuth: ClientAuthentication = storage
    ? getClientAuthenticationWithDependencies({
        secureStorage: storage,
        insecureStorage: storage,
      })
    : getClientAuthenticationWithDependencies({
        secureStorage: defaultStorage,
        insecureStorage: defaultStorage,
      });
  return clientAuth.clearSessionAll();
}
