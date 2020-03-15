import { inject, injectable } from "tsyringe";
import INeededAction from "./INeededAction";
import ISolidSession from "./ISolidSession";
import { IUuidGenerator } from "../util/UuidGenerator";
import { RequestInfo, RequestInit, Response } from "node-fetch";
import IAuthenticatedFetcher from "../authenticatedFetch/IAuthenticatedFetcher";
import ILogoutHandler from "../logout/ILogoutHandler";

export interface ISessionCreatorOptions {
  localUserId?: string;
  webId?: string;
  state?: string;
  neededAction?: INeededAction;
}

export interface ISessionCreator {
  create(options: ISessionCreatorOptions): ISolidSession;
}

@injectable()
export default class SessionCreator implements ISessionCreator {
  constructor(
    @inject("uuidGenerator") private uuidGenerator: IUuidGenerator,
    @inject("authenticatedFetcher")
    private authenticatedFetcher: IAuthenticatedFetcher,
    @inject("logoutHandler") private logoutHandler: ILogoutHandler
  ) {}

  create(options: ISessionCreatorOptions): ISolidSession {
    const localUserId: string = options.localUserId || this.uuidGenerator.v4();
    return {
      localUserId,
      webId: options.webId,
      neededAction: options.neededAction,
      state: options.state,
      logout: async (): Promise<void> => {
        // TODO: handle if webid isn't here
        return this.logoutHandler.handle(localUserId);
      },
      fetch: (url: RequestInfo, init: RequestInit): Promise<Response> => {
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
  }
}
