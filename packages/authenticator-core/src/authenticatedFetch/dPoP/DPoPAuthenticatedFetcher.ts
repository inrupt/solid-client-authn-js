/**
 * Responsible for sending DPoP Enabled requests
 */
import IAuthenticatedFetcher from "../IAuthenticatedFetcher";
import IRequestCredentials from "../IRequestCredentials";
import ConfigurationError from "../../util/errors/ConfigurationError";
import IDPoPRequestCredentials from "../../util/dpop/IDPoPRequestCredentials";
import { injectable, inject } from "tsyringe";
import URL from "url-parse";
import { IFetcher } from "../../util/Fetcher";
import { IDPoPHeaderCreator } from "../../util/dpop/DPoPHeaderCreator";

@injectable()
export default class DPoPAuthenticatedFetcher implements IAuthenticatedFetcher {
  constructor(
    @inject("dPoPHeaderCreator") private dPoPHeaderCreator: IDPoPHeaderCreator,
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
        `DPoP Authenticated Fetcher Cannot handle ${requestCredentials}`
      );
    }
    const dPoPRequestCredentials: IDPoPRequestCredentials = requestCredentials as IDPoPRequestCredentials;
    const requestInitiWithDefaults = {
      headers: {},
      method: "GET",
      ...requestInit
    };
    return this.fetcher.fetch(url, {
      ...requestInit,
      headers: {
        ...requestInitiWithDefaults.headers,
        authorization: `DPOP ${dPoPRequestCredentials.authToken}`,
        dpop: await this.dPoPHeaderCreator.createHeaderToken(
          url,
          requestInitiWithDefaults.method
        )
      }
    });
  }
}
