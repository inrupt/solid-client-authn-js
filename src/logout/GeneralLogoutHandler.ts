/**
 * Proprietary and Confidential
 *
 * Copyright 2020 Inrupt Inc. - all rights reserved.
 *
 * Do not use without explicit permission from Inrupt Inc.
 */

import ILogoutHandler from "./ILogoutHandler";
import { inject, injectable } from "tsyringe";
import { IStorageUtility } from "../localStorage/StorageUtility";

@injectable()
export default class LogoutHandler implements ILogoutHandler {
  constructor(
    @inject("storageUtility") private storageUtility: IStorageUtility
  ) {}

  async canHandle(): Promise<boolean> {
    return true;
  }

  async handle(userId: string): Promise<void> {
    this.storageUtility.deleteAllUserData(userId);
    // TODO: trigger onLogOut()
  }
}
