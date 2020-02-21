/**
 * Responsible for sending DPoP Enabled requests
 */
import IAuthenticatedFetcher from "../IAuthenticatedFetcher";
import IRequestCredentials from "../IRequestCredentials";
import ConfigurationError from "../../util/errors/ConfigurationError";
import IDpopRequestCredentials from "../../util/dpop/IDpopRequestCredentials";
import { injectable, inject } from "tsyringe";
import URL from "url-parse";
import { IFetcher } from "../../util/Fetcher";
import { IDpopHeaderCreator } from "../../util/dpop/DpopHeaderCreator";

@injectable()
export default class DpopAuthenticatedFetcher implements IAuthenticatedFetcher {
  constructor(
    @inject("dpopHeaderCreator") private dpopHeaderCreator: IDpopHeaderCreator,
    @inject("fetcher") private fetcher: IFetcher
  ) {}

  async canHandle(
    requestCredentials: IRequestCredentials,
    url: URL,
    requestInit?: RequestInit
  ): Promise<boolean> {
    // TODO include a schema check for the submitted data
    return requestCredentials.type === "dpop";
  }

  async handle(
    requestCredentials: IRequestCredentials,
    url: URL,
    requestInit?: RequestInit
  ): Promise<Response> {
    if (!(await this.canHandle(requestCredentials, url, requestInit))) {
      throw new ConfigurationError(
        `Dpop Authenticated Fetcher Cannot handle ${requestCredentials}`
      );
    }
    const dpopRequestCredentials: IDpopRequestCredentials = requestCredentials as IDpopRequestCredentials;
    const requestInitiWithDefaults = {
      headers: {},
      method: "GET",
      ...requestInit
    };
    return this.fetcher.fetch(url, {
      ...requestInit,
      headers: {
        ...requestInitiWithDefaults.headers,
        authorization: `DPOP ${dpopRequestCredentials.authToken}`,
        dpop: await this.dpopHeaderCreator.createHeaderToken(
          url,
          requestInitiWithDefaults.method
        )
      }
    });
  }
}
