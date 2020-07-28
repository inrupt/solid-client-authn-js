/**
 * Copyright 2020 Inrupt Inc.
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

import { inject, injectable } from "tsyringe";
import { IStorageUtility } from "../storage/StorageUtility";
import ISessionInfo from "./ISessionInfo";

export interface ISessionInfoManagerOptions {
  loggedIn?: boolean;
  webId?: string;
}

export interface ISessionInfoManager {
  update(sessionId: string, options: ISessionInfoManagerOptions): Promise<void>;
  get(sessionId: string): Promise<ISessionInfo | undefined>;
  getAll(): Promise<ISessionInfo[]>;
}

@injectable()
export default class SessionInfoManager implements ISessionInfoManager {
  constructor(
    @inject("storageUtility") private storageUtility: IStorageUtility
  ) {}

  update(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sessionId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options: ISessionInfoManagerOptions
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

  async get(sessionId: string): Promise<ISessionInfo | undefined> {
    const webId = await this.storageUtility.getForUser(sessionId, "webId", {
      secure: true
    });
    const isLoggedIn = await this.storageUtility.getForUser(
      sessionId,
      "isLoggedIn",
      {
        secure: true
      }
    );
    if (isLoggedIn !== undefined) {
      return {
        sessionId,
        webId: webId,
        isLoggedIn: isLoggedIn === "true"
      };
    }
    return undefined;
  }

  async getAll(): Promise<ISessionInfo[]> {
    throw new Error("Not implemented");
  }
}
