import { inject, injectable } from "tsyringe";
import INeededAction from "./INeededAction";
import ISolidSession from "./ISolidSession";
import { IUuidGenerator } from "../util/UuidGenerator";
import IAuthenticatedFetcher from "../authenticatedFetch/IAuthenticatedFetcher";
import ILogoutHandler from "../logout/ILogoutHandler";
import { IStorageUtility } from "../localStorage/StorageUtility";

export interface ISessionCreatorOptions {
  localUserId?: string;
  loggedIn: boolean;
  webId?: string;
  state?: string;
  neededAction?: INeededAction;
}

export interface ISessionCreator {
  create(options: ISessionCreatorOptions): ISolidSession;
  getSession(localUserId: string): Promise<ISolidSession | null>;
}

@injectable()
export default class SessionCreator implements ISessionCreator {
  constructor(
    @inject("uuidGenerator") private uuidGenerator: IUuidGenerator,
    @inject("authenticatedFetcher")
    private authenticatedFetcher: IAuthenticatedFetcher,
    @inject("logoutHandler") private logoutHandler: ILogoutHandler,
    @inject("storageUtility") private storageUtility: IStorageUtility
  ) {}

  create(options: ISessionCreatorOptions): ISolidSession {
    const localUserId: string = options.localUserId || this.uuidGenerator.v4();
    if (options.loggedIn) {
      return {
        localUserId,
        loggedIn: true,
        webId: options.webId as string,
        neededAction: options.neededAction || { actionType: "inaction" },
        state: options.state,
        logout: async (): Promise<void> => {
          // TODO: handle if webid isn't here
          return this.logoutHandler.handle(localUserId);
        },
        fetch: (url: RequestInfo, init?: RequestInit): Promise<Response> => {
          // TODO: handle if webid isn't here
          return this.authenticatedFetcher.handle(
            {
              localUserId,
              type: "dpop"
            },
            url,
            init
          );
        }
      };
    } else {
      return {
        localUserId,
        loggedIn: false,
        neededAction: options.neededAction || { actionType: "inaction" }
      };
    }
  }

  async getSession(localUserId: string): Promise<ISolidSession | null> {
    const webId = await this.storageUtility.getForUser(localUserId, "webId");
    const accessToken = await this.storageUtility.getForUser(
      localUserId,
      "accessToken"
    );
    if (webId) {
      return this.create({
        localUserId,
        webId: webId,
        loggedIn: !!accessToken
      });
    }
    return null;
  }
}
