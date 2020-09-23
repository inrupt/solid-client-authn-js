/*
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

/**
 * @hidden
 * @packageDocumentation
 */

/**
 * Responsible for sending fetch requests given a token that is not DPoP compatible
 */
import {
  IAuthenticatedFetcher,
  IRequestCredentials,
  IStorageUtility,
} from "@inrupt/solid-client-authn-core";
import { inject, injectable } from "tsyringe";
import { IFetcher } from "../../util/Fetcher";
import { flattenHeaders } from "../headers/HeadersUtils";

/**
 * @hidden
 */
@injectable()
export default class BearerAuthenticatedFetcher
  implements IAuthenticatedFetcher {
  constructor(
    @inject("fetcher") private fetcher: IFetcher,
    @inject("storageUtility")
    private storageUtility: IStorageUtility
  ) {}

  async canHandle(
    requestCredentials: IRequestCredentials,
    /* eslint-disable @typescript-eslint/no-unused-vars */
    url: RequestInfo,
    requestInit?: RequestInit
    /* eslint-enable @typescript-eslint/no-unused-vars */
  ): Promise<boolean> {
    return requestCredentials.type === "bearer";
  }

  async handle(
    requestCredentials: IRequestCredentials,
    url: RequestInfo,
    requestInit?: RequestInit
  ): Promise<Response> {
    if (!(await this.canHandle(requestCredentials, url, requestInit))) {
      throw new Error(
        `BearerAuthenticatedFetcher cannot handle a request with the credentials [${JSON.stringify(
          requestCredentials
        )}]`
      );
    }
    const authToken = await this.storageUtility.getForUser(
      requestCredentials.localUserId,
      "accessToken",
      {
        secure: true,
      }
    );
    if (!authToken) {
      throw new Error(
        `No bearer token are available for session [${requestCredentials.localUserId}]`
      );
    }
    const requestInitiWithDefaults = {
      headers: {},
      method: "GET",
      ...requestInit,
    };
    return this.fetcher.fetch(url, {
      ...requestInit,
      headers: {
        ...flattenHeaders(requestInitiWithDefaults.headers as Headers),
        authorization: `Bearer ${authToken}`,
      },
    });
  }
}
