/**
 * Responsible for sending fetch requests given a token that is not DPoP compatible
 */
import IAuthenticatedFetcher from "../IAuthenticatedFetcher";
import IRequestCredentials from "../IRequestCredentials";
import NotImplementedError from "../../errors/NotImplementedError";

export default class BearerAuthenticatedFetcher
  implements IAuthenticatedFetcher {
  async canHandle(
    requestCredentials: IRequestCredentials,
    url: RequestInfo,
    requestInit?: RequestInit
  ): Promise<boolean> {
    return requestCredentials.type === "bearer";
  }

  async handle(
    requestCredentials: IRequestCredentials,
    url: RequestInfo,
    requestInit?: RequestInit
  ): Promise<Response> {
    "";
    throw new NotImplementedError("BearerAuthenticatedFetcher");
  }
}
