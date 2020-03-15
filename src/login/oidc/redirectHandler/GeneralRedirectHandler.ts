import ISolidSession from "../../../solidSession/ISolidSession";
import IRedirectHandler from "./IRedirectHandler";
import URL from "url-parse";
import ConfigurationError from "../../..//errors/ConfigurationError";
import { inject, injectable } from "tsyringe";
import IJoseUtility from "../../../jose/IJoseUtility";
import { IStorageUtility } from "../../../localStorage/StorageUtility";
import { ISessionCreator } from "../../../solidSession/SessionCreator";
import INeededInactionAction from "../../../solidSession/INeededInactionAction";

@injectable()
export default class GeneralRedirectHandler implements IRedirectHandler {
  constructor(
    @inject("joseUtility") private joseUtility: IJoseUtility,
    @inject("storageUtility") private storageUtility: IStorageUtility,
    @inject("sessionCreator") private sessionCreator: ISessionCreator
  ) {}

  async canHandle(redirectUrl: string): Promise<boolean> {
    const url = new URL(redirectUrl, true);
    return !!(url.query && url.query.id_token && url.query.access_token);
  }
  async handle(redirectUrl: string): Promise<ISolidSession> {
    if (!(await this.canHandle(redirectUrl))) {
      throw new ConfigurationError(`Cannot handle redirect url ${redirectUrl}`);
    }
    const url = new URL(redirectUrl, true);
    const decoded = await this.joseUtility.decodeJWT(
      url.query.id_token as string
    );
    // TODO validate decoded token
    // TODO extract the localUserId from state and put it in the session
    const session = this.sessionCreator.create({
      webId: decoded.sub,
      neededAction: {
        actionType: "inaction"
      } as INeededInactionAction
    });
    await Promise.all([
      this.storageUtility.setForUser(
        session.localUserId,
        "accessToken",
        url.query.access_token as string
      ),
      this.storageUtility.setForUser(
        session.localUserId,
        "idToken",
        url.query.id_token as string
      ),
      this.storageUtility.setForUser(session.localUserId, "webId", decoded.sub)
    ]);
    return session;
  }
}
