import ILogoutHandler from "./ILogoutHandler";
import { inject, injectable } from "tsyringe";
import { IStorageUtility } from "../localStorage/StorageUtility";

@injectable()
export default class LogoutHandler implements ILogoutHandler {
  constructor(
    @inject("storageUtility") private storageUtility: IStorageUtility
  ) {}

  async canHandle(userId: string): Promise<boolean> {
    return true;
  }

  async handle(userId: string): Promise<void> {
    this.storageUtility.deleteAllUserData(userId);
    // TODO: trigger onLogOut()
  }
}
