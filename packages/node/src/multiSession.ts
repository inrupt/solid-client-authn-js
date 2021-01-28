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

import { IStorage } from "@inrupt/solid-client-authn-core";
import ClientAuthentication from "./ClientAuthentication";
import { getClientAuthenticationWithDependencies } from "./dependencies";
import { defaultStorage, Session } from "./Session";

export async function getSessionFromStorage(
  sessionId: string,
  storage?: IStorage
): Promise<Session | undefined> {
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
  });
  if (sessionInfo.refreshToken) {
    await session.login({
      oidcIssuer: sessionInfo.issuer,
    });
  }
  return session;
}

export async function getSessionIdFromStorageAll(
  storage?: IStorage
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

export async function clearSessionFromStorageAll(
  storage?: IStorage
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
