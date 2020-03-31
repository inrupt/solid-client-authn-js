/**
 * An aggregate AuthenticatedFetcher responsible for selecting the correct AuthenticatedFetcher
 * for a given set of credentials and request parameters
 */
import { injectable, injectAll } from "tsyringe";
import { RequestInit, Response, RequestInfo } from "node-fetch";
import AggregateHandler from "../util/handlerPattern/AggregateHandler";
import IAuthenticatedFetcher from "./IAuthenticatedFetcher";
import IRequestCredentials from "./IRequestCredentials";

@injectable()
export default class AggregateAuthenticatedFetcher
  extends AggregateHandler<
    [IRequestCredentials, RequestInfo, RequestInit?],
    Response
  >
  implements IAuthenticatedFetcher {
  constructor(
    @injectAll("authenticatedFetchers")
    authenticatedFetchers: IAuthenticatedFetcher[]
  ) {
    super(authenticatedFetchers);
  }
}
