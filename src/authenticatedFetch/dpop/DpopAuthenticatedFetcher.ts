/**
 * Responsible for sending DPoP Enabled requests
 */
import { RequestInit, Response, RequestInfo } from "node-fetch";
import IAuthenticatedFetcher from "../IAuthenticatedFetcher";
import IRequestCredentials from "../IRequestCredentials";
import ConfigurationError from "../../errors/ConfigurationError";
import IDpopRequestCredentials from "../../dpop/IDpopRequestCredentials";
import { injectable, inject } from "tsyringe";
import { IFetcher } from "../../util/Fetcher";
import { IDpopHeaderCreator } from "../../dpop/DpopHeaderCreator";
import { IUrlRepresentationConverter } from "../../util/UrlRepresenationConverter";

@injectable()
export default class DpopAuthenticatedFetcher implements IAuthenticatedFetcher {
  constructor(
    @inject("dpopHeaderCreator") private dpopHeaderCreator: IDpopHeaderCreator,
    @inject("fetcher") private fetcher: IFetcher,
    @inject("urlRepresentationConverter")
    private urlRepresentationConverter: IUrlRepresentationConverter
  ) {}

  async canHandle(
    requestCredentials: IRequestCredentials,
    url: RequestInfo,
    requestInit?: RequestInit
  ): Promise<boolean> {
    return requestCredentials.type === "dpop";
  }

  async handle(
    requestCredentials: IRequestCredentials,
    url: RequestInfo,
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
          this.urlRepresentationConverter.requestInfoToUrl(url),
          requestInitiWithDefaults.method
        )
      }
    });
  }
}
