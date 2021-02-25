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
  ISessionInfoManager,
  ISessionInternalInfo,
  ISessionInfoManagerOptions,
  IStorageUtility,
} from "@inrupt/solid-client-authn-core";
import { v4 } from "uuid";
import { clearOidcPersistentStorage } from "@inrupt/oidc-client-ext";
import { fetchWithCookies } from "../ClientAuthentication";

export function getUnauthenticatedSession(): ISessionInfo & {
  fetch: typeof fetch;
} {
  return {
    isLoggedIn: false,
    sessionId: v4(),
    fetch: fetchWithCookies,
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
  const storedSessionCookieReference = await storage.get(
    "tmp-resource-server-session-info"
  );
  const reference = JSON.parse(storedSessionCookieReference ?? "{}");
  const { webId } = reference;
  if (webId !== undefined) {
    const webIdAsUrl = new URL(webId);
    const resourceServerIri = webIdAsUrl.origin;
    await storage.clearResourceServerSessionInfo(resourceServerIri);
  }
  await Promise.all([
    storage.deleteAllUserData(sessionId, { secure: false }),
    storage.deleteAllUserData(sessionId, { secure: true }),
    // FIXME: This is needed until the DPoP key is stored safely
    storage.delete("clientKey", { secure: false }),
  ]);
  await clearOidcPersistentStorage();
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
    const isLoggedIn = await this.storageUtility.getForUser(
      sessionId,
      "isLoggedIn",
      {
        secure: true,
      }
    );

    const webId = await this.storageUtility.getForUser(sessionId, "webId", {
      secure: true,
    });

    const clientId = await this.storageUtility.getForUser(
      sessionId,
      "clientId",
      {
        secure: false,
      }
    );

    const clientSecret = await this.storageUtility.getForUser(
      sessionId,
      "clientSecret",
      {
        secure: false,
      }
    );

    const idToken = await this.storageUtility.getForUser(sessionId, "idToken", {
      secure: false,
    });

    const redirectUrl = await this.storageUtility.getForUser(
      sessionId,
      "redirectUrl",
      {
        secure: false,
      }
    );

    const refreshToken = await this.storageUtility.getForUser(
      sessionId,
      "refreshToken",
      {
        secure: true,
      }
    );

    const issuer = await this.storageUtility.getForUser(sessionId, "issuer", {
      secure: false,
    });

    if (
      clientId === undefined &&
      idToken === undefined &&
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
      idToken,
      refreshToken,
      issuer,
      clientAppId: clientId,
      clientAppSecret: clientSecret,
    };
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
