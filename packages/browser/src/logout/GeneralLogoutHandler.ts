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

/**
 * @hidden
 * @packageDocumentation
 */

import ILogoutHandler from "./ILogoutHandler";
import { inject, injectable } from "tsyringe";
import { IStorageUtility } from "../storage/StorageUtility";

/**
 * This function removes all session-related information from storage.
 * @param userId the session identifier
 * @param storage the storage where session info is stored
 * @hidden
 */
export async function clearSession(
  userId: string,
  storage: IStorageUtility
): Promise<void> {
  await Promise.all([
    storage.deleteAllUserData(userId, { secure: false }),
    storage.deleteAllUserData(userId, { secure: true }),
    // FIXME: This is needed until the DPoP key is stored safely
    storage.delete("clientKey", { secure: false }),
  ]);
}

/**
 * @hidden
 */
@injectable()
export default class LogoutHandler implements ILogoutHandler {
  constructor(
    @inject("storageUtility") private storageUtility: IStorageUtility
  ) {}

  async canHandle(): Promise<boolean> {
    return true;
  }

  async handle(userId: string): Promise<void> {
    await clearSession(userId, this.storageUtility);
  }
}
