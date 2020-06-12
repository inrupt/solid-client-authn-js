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

import ISessionInfo from "../../../sessionInfo/ISessionInfo";
import { injectable, inject } from "tsyringe";
import IJoseUtility from "../../../jose/IJoseUtility";
import { IStorageUtility } from "../../../storage/StorageUtility";
import { ISessionInfoManager } from "../../../sessionInfo/SessionInfoManager";

export interface ITokenSaver {
  saveTokenAndGetSession(
    localUserId: string,
    idToken: string,
    accessToken?: string,
    refreshToken?: string
  ): Promise<ISessionInfo>;
}

@injectable()
export default class TokenSaver implements ITokenSaver {
  constructor(
    @inject("sessionInfoManager") private sessionCreator: ISessionInfoManager,
    @inject("joseUtility") private joseUtility: IJoseUtility,
    @inject("storageUtility") private storageUtility: IStorageUtility
  ) {}

  async saveTokenAndGetSession(
    localUserId: string,
    idToken: string,
    accessToken?: string,
    refreshToken?: string
  ): Promise<ISessionInfo> {
    throw new Error("Not Implemented");
    // const decoded = await this.joseUtility.decodeJWT(
    //   // TODO this should actually be the id_vc of the token
    //   accessToken as string
    // );
    // // TODO validate decoded token
    // // TODO extract the localUserId from state and put it in the session
    // const session = this.sessionCreator.create({
    //   localUserId,
    //   webId: decoded.sub as string,
    //   loggedIn: true
    // });
    // await this.storageUtility.setForUser(
    //   session.localUserId,
    //   "accessToken",
    //   accessToken as string
    // );
    // await this.storageUtility.setForUser(
    //   session.localUserId,
    //   "idToken",
    //   idToken as string
    // );
    // await this.storageUtility.setForUser(
    //   session.localUserId,
    //   "webId",
    //   decoded.sub as string
    // );
    // await this.storageUtility.setForUser(
    //   session.localUserId,
    //   "refreshToken",
    //   refreshToken as string
    // );
    // return session;
  }
}
