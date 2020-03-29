import ISolidSession from "../../../solidSession/ISolidSession";
import { injectable, inject } from "tsyringe";
import { ISessionCreator } from "../../../solidSession/SessionCreator";
import IJoseUtility from "../../../jose/IJoseUtility";
import INeededInactionAction from "../../../solidSession/INeededInactionAction";
import { IStorageUtility } from "../../../localStorage/StorageUtility";

export interface ITokenSaver {
  saveTokenAndGetSession(
    localUserId: string,
    idToken: string,
    accessToken?: string
  ): Promise<ISolidSession>;
}

@injectable()
export default class TokenSaver implements ITokenSaver {
  constructor(
    @inject("sessionCreator") private sessionCreator: ISessionCreator,
    @inject("joseUtility") private joseUtility: IJoseUtility,
    @inject("storageUtility") private storageUtility: IStorageUtility
  ) {}

  async saveTokenAndGetSession(
    localUserId: string,
    idToken: string,
    accessToken?: string
  ): Promise<ISolidSession> {
    const decoded = await this.joseUtility.decodeJWT(
      // TODO this should actually be the id_vc of the token
      accessToken as string
    );
    // TODO validate decoded token
    // TODO extract the localUserId from state and put it in the session
    const session = this.sessionCreator.create({
      localUserId,
      webId: decoded.sub as string,
      neededAction: {
        actionType: "inaction"
      } as INeededInactionAction
    });
    await this.storageUtility.setForUser(
      session.localUserId,
      "accessToken",
      accessToken as string
    );
    await this.storageUtility.setForUser(
      session.localUserId,
      "idToken",
      idToken as string
    );
    await this.storageUtility.setForUser(
      session.localUserId,
      "webId",
      decoded.sub as string
    );
    return session;
  }
}
