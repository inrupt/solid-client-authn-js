import ISolidSession from "../../../solidSession/ISolidSession";
import IRedirectHandler from "./IRedirectHandler";
import URL from "url-parse";
import ConfigurationError from "../../..//errors/ConfigurationError";
import { Response, RequestInfo, RequestInit } from "node-fetch";
import { inject, injectable } from "tsyringe";
import IJoseUtility from "../../../jose/IJoseUtility";
import { IStorageUtility } from "../../../localStorage/StorageUtility";
import { IUuidGenerator } from "../../../util/UuidGenerator";
import IAuthenticatedFetcher from "../../../authenticatedFetch/IAuthenticatedFetcher";
import ILogoutHandler from "../../../logout/ILogoutHandler";

@injectable()
export default class GeneralRedirectHandler implements IRedirectHandler {
  constructor(
    @inject("joseUtility") private joseUtility: IJoseUtility,
    @inject("storageUtility") private storageUtility: IStorageUtility,
    @inject("uuidGenerator") private uuidGenerator: IUuidGenerator,
    @inject("authenticatedFetcher")
    private authenticatedFetcher: IAuthenticatedFetcher,
    @inject("logoutHandler") private logoutHandler: ILogoutHandler
  ) {}

  async canHandle(redirectUrl: string): Promise<boolean> {
    const url = new URL(redirectUrl, true);
    return !!(url.query && url.query.id_token && url.query.access_token);
  }
  async handle(redirectUrl: string): Promise<ISolidSession> {
    if (!(await this.canHandle(redirectUrl))) {
      throw new ConfigurationError(`Cannot handle redirect url ${redirectUrl}`);
    }
    const localUserId = this.uuidGenerator.v4();
    const url = new URL(redirectUrl, true);
    const decoded = await this.joseUtility.decodeJWT(
      url.query.id_token as string
    );
    // TODO validate decoded token
    await Promise.all([
      this.storageUtility.setForUser(
        localUserId,
        "accessToken",
        url.query.access_token as string
      ),
      this.storageUtility.setForUser(
        localUserId,
        "idToken",
        url.query.id_token as string
      ),
      this.storageUtility.setForUser(localUserId, "webId", decoded.sub)
    ]);
    return {
      localUserId,
      webId: decoded.sub,
      state: url.query.state,
      logout: async (): Promise<void> => {
        this.logoutHandler.handle(localUserId);
      },
      fetch: async (url: RequestInfo, init: RequestInit): Promise<Response> => {
        return this.authenticatedFetcher.handle(
          {
            localUserId,
            type: "dpop"
          },
          // TODO: this isn't fully type safe
          new URL(url as string),
          init
        );
      }
    };
  }
}
