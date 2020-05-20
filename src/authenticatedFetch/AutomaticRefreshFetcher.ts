/**
 * Copyright 2020 Inrupt Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import IAuthenticatedFetcher from "./IAuthenticatedFetcher";
import { injectable, inject } from "tsyringe";
import IRequestCredentials from "./IRequestCredentials";
import { ITokenRefresher } from "../login/oidc/refresh/TokenRefresher";

@injectable()
export default class AutomaticRefreshHandler implements IAuthenticatedFetcher {
  constructor(
    @inject("aggregateAuthenticatedFetcher")
    private aggregateAuthenticatedFetcher: IAuthenticatedFetcher,
    @inject("tokenRefresher") private tokenRefresher: ITokenRefresher
  ) {}

  async canHandle(
    requestCredentials: IRequestCredentials,
    url: RequestInfo,
    requestInit?: RequestInit
  ): Promise<boolean> {
    return true;
  }

  async handle(
    requestCredentials: IRequestCredentials,
    url: RequestInfo,
    requestInit?: RequestInit
  ): Promise<Response> {
    const response = await this.aggregateAuthenticatedFetcher.handle(
      requestCredentials,
      url,
      requestInit
    );
    if (response.status === 401) {
      try {
        await this.tokenRefresher.refresh(requestCredentials.localUserId);
        return this.aggregateAuthenticatedFetcher.handle(
          requestCredentials,
          url,
          requestInit
        );
      } catch (err) {
        // Do nothing
      }
    }
    return response;
  }
}
