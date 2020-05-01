/**
 * Proprietary and Confidential
 *
 * Copyright 2020 Inrupt Inc. - all rights reserved.
 *
 * Do not use without explicit permission from Inrupt Inc.
 */

/**
 * AuthenticatedFetchers are responsible for making requests based on provided credentials
 *
 * @IRequestCredentials A set of credentials that should be embedded in the request
 * @URL The URL of the request
 * @RequestInit The fetch init params to define the request
 */
import IHandleable from "../util/handlerPattern/IHandleable";
import IRequestCredentials from "./IRequestCredentials";

type IAuthenticatedFetcher = IHandleable<
  [IRequestCredentials, RequestInfo, RequestInit?],
  Response
>;
export default IAuthenticatedFetcher;
