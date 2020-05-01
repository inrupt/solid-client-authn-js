/**
 * Proprietary and Confidential
 *
 * Copyright 2020 Inrupt Inc. - all rights reserved.
 *
 * Do not use without explicit permission from Inrupt Inc.
 */

/**
 * An aggregate AuthenticatedFetcher responsible for selecting the correct AuthenticatedFetcher
 * for a given set of credentials and request parameters
 */
import { injectable, injectAll } from "tsyringe";
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
