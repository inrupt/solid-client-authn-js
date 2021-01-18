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

import { inject, injectable } from "tsyringe";
import {
  ISessionInfo,
  ISessionInternalInfo,
  ISessionInfoManager,
  ISessionInfoManagerOptions,
  IStorageUtility,
} from "@inrupt/solid-client-authn-core";
import { v4 } from "uuid";
import { fetch } from "cross-fetch";

export function getUnauthenticatedSession(): ISessionInfo & {
  fetch: typeof fetch;
} {
  return {
    isLoggedIn: false,
    sessionId: v4(),
    fetch,
  };
}

/**
 * @param sessionId
 * @param storage
 * @hidden
 */
export async function clear(
  sessionId: string,
  storage: IStorageUtility
): Promise<void> {
  await Promise.all([
    storage.deleteAllUserData(sessionId, { secure: false }),
    storage.deleteAllUserData(sessionId, { secure: true }),
    // FIXME: This is needed until the DPoP key is stored safely
    storage.delete("clientKey", { secure: false }),
  ]);
  // TODO: Clear OIDC storage if need be.
  // await clearOidcPersistentStorage();
}

/**
 * @hidden
 */
@injectable()
export class SessionInfoManager implements ISessionInfoManager {
  constructor(
    @inject("storageUtility") private storageUtility: IStorageUtility
  ) {}

  // eslint-disable-next-line class-methods-use-this
  update(
    _sessionId: string,
    _options: ISessionInfoManagerOptions
  ): Promise<void> {
    // const localUserId: string = options.localUserId || this.uuidGenerator.v4();
    // if (options.loggedIn) {
    //   return {
    //     sessionId,
    //     loggedIn: true,
    //     webId: options.webId as string,
    //     neededAction: options.neededAction || { actionType: "inaction" },
    //     state: options.state,
    //     logout: async (): Promise<void> => {
    //       // TODO: handle if webid isn't here
    //       return this.logoutHandler.handle(localUserId);
    //     },
    //     fetch: (url: RequestInfo, init?: RequestInit): Promise<Response> => {
    //       // TODO: handle if webid isn't here
    //       return this.authenticatedFetcher.handle(
    //         {
    //           localUserId,
    //           type: "dpop"
    //         },
    //         url,
    //         init
    //       );
    //     }
    //   };
    // } else {
    //   return {
    //     localUserId,
    //     loggedIn: false,
    //     neededAction: options.neededAction || { actionType: "inaction" }
    //   };
    // }
    throw new Error("Not Implemented");
  }

  async get(
    sessionId: string
  ): Promise<(ISessionInfo & ISessionInternalInfo) | undefined> {
    const webId = await this.storageUtility.getForUser(sessionId, "webId");
    const isLoggedIn = await this.storageUtility.getForUser(
      sessionId,
      "isLoggedIn"
    );
    const refreshToken = await this.storageUtility.getForUser(
      sessionId,
      "refreshToken"
    );
    const issuer = await this.storageUtility.getForUser(sessionId, "issuer");

    if (isLoggedIn !== undefined) {
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
}
