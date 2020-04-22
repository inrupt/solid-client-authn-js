/**
 * Responsible for sending DPoP Enabled requests
 */
import IAuthenticatedFetcher from "../IAuthenticatedFetcher";
import IRequestCredentials from "../IRequestCredentials";
import ConfigurationError from "../../errors/ConfigurationError";
import IDpopRequestCredentials from "../../dpop/IDpopRequestCredentials";
import { injectable, inject } from "tsyringe";
import { IFetcher } from "../../util/Fetcher";
import { IDpopHeaderCreator } from "../../dpop/DpopHeaderCreator";
import { IUrlRepresentationConverter } from "../../util/UrlRepresenationConverter";
import { IStorageUtility } from "../../localStorage/StorageUtility";

@injectable()
export default class DpopAuthenticatedFetcher implements IAuthenticatedFetcher {
  constructor(
    @inject("dpopHeaderCreator") private dpopHeaderCreator: IDpopHeaderCreator,
    @inject("fetcher") private fetcher: IFetcher,
    @inject("urlRepresentationConverter")
    private urlRepresentationConverter: IUrlRepresentationConverter,
    @inject("storageUtility") private storageUtility: IStorageUtility
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
        `Dpop Authenticated Fetcher cannot handle ${JSON.stringify(requestCredentials)}`
      );
    }
    const authToken = await this.storageUtility.getForUser(
      requestCredentials.localUserId,
      "accessToken"
    );
    if (!authToken) {
      throw new Error("Auth token not available");
    }
    const requestInitiWithDefaults = {
      headers: {},
      method: "GET",
      ...requestInit
    };
    return this.fetcher.fetch(url, {
      ...requestInit,
      headers: {
        ...requestInitiWithDefaults.headers,
        authorization: `DPOP ${authToken}`,
        dpop: await this.dpopHeaderCreator.createHeaderToken(
          this.urlRepresentationConverter.requestInfoToUrl(url),
          requestInitiWithDefaults.method
        )
      }
    });
  }
}
