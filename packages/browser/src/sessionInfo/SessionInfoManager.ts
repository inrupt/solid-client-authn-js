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
  ISessionInfoManager,
  ISessionInternalInfo,
  IStorageUtility,
} from "@inrupt/solid-client-authn-core";
import {
  isSupportedTokenType,
  clear as clearBase,
  SessionInfoManagerBase,
  isValidRedirectUrl,
} from "@inrupt/solid-client-authn-core";
import { clearOidcPersistentStorage } from "@inrupt/oidc-client-ext";

export { getUnauthenticatedSession } from "@inrupt/solid-client-authn-core";

/**
 * @param sessionId
 * @param storage
 * @hidden
 */
export async function clear(
  sessionId: string,
  storage: IStorageUtility,
): Promise<void> {
  await clearBase(sessionId, storage);
  await clearOidcPersistentStorage();
}

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
    const [
      isLoggedIn,
      webId,
      clientId,
      clientSecret,
      redirectUrl,
      refreshToken,
      issuer,
      tokenType,
    ] = await Promise.all([
      this.storageUtility.getForUser(sessionId, "isLoggedIn", {
        secure: true,
      }),
      this.storageUtility.getForUser(sessionId, "webId", {
        secure: true,
      }),
      this.storageUtility.getForUser(sessionId, "clientId", {
        secure: false,
      }),
      this.storageUtility.getForUser(sessionId, "clientSecret", {
        secure: false,
      }),
      this.storageUtility.getForUser(sessionId, "redirectUrl", {
        secure: false,
      }),
      this.storageUtility.getForUser(sessionId, "refreshToken", {
        secure: true,
      }),
      this.storageUtility.getForUser(sessionId, "issuer", {
        secure: false,
      }),
      this.storageUtility.getForUser(sessionId, "tokenType", {
        secure: false,
      }),
    ]);

    if (typeof redirectUrl === "string" && !isValidRedirectUrl(redirectUrl)) {
      // This resolves the issue for people experiencing https://github.com/inrupt/solid-client-authn-js/issues/2891.
      // An invalid redirect URL is present in the storage, and the session should
      // be cleared to get a fresh start. This will require the user to log back in.
      await Promise.all([
        this.storageUtility.deleteAllUserData(sessionId, { secure: false }),
        this.storageUtility.deleteAllUserData(sessionId, { secure: true }),
      ]);
      return undefined;
    }

    if (tokenType !== undefined && !isSupportedTokenType(tokenType)) {
      throw new Error(`Tokens of type [${tokenType}] are not supported.`);
    }

    if (
      clientId === undefined &&
      isLoggedIn === undefined &&
      webId === undefined &&
      refreshToken === undefined
    ) {
      return undefined;
    }

    return {
      sessionId,
      webId,
      isLoggedIn: isLoggedIn === "true",
      redirectUrl,
      refreshToken,
      issuer,
      clientAppId: clientId,
      clientAppSecret: clientSecret,
      // Default the token type to DPoP if unspecified.
      tokenType: tokenType ?? "DPoP",
    };
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
}
