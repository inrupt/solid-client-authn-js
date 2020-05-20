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

/**
 * Responsible for sending DPoP Enabled requests
 */
import IAuthenticatedFetcher from "../IAuthenticatedFetcher";
import IRequestCredentials from "../IRequestCredentials";
import ConfigurationError from "../../errors/ConfigurationError";
import { injectable, inject } from "tsyringe";
import { IFetcher } from "../../util/Fetcher";
import { IDpopHeaderCreator } from "../../dpop/DpopHeaderCreator";
import { IUrlRepresentationConverter } from "../../util/UrlRepresenationConverter";
import { IStorageUtility } from "../../localStorage/StorageUtility";
import { Headers as NodeHeaders } from "cross-fetch";

export function flattenHeaders(
  headersToFlatten: Headers | string[][] | Record<string, string> | undefined
): Record<string, string> {
  const flatHeaders: Record<string, string> = {};
  const iterableHeaders = new NodeHeaders(headersToFlatten);
  iterableHeaders.forEach((value, key) => {
    flatHeaders[key] = value;
  });
  return flatHeaders;
}

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
        `Dpop Authenticated Fetcher cannot handle ${JSON.stringify(
          requestCredentials
        )}`
      );
    }
    const authToken = await this.storageUtility.getForUser(
      requestCredentials.localUserId,
      "accessToken"
    );
    const requestInitiWithDefaults = {
      headers: {},
      method: "GET",
      ...requestInit
    };
    if (!authToken) {
      // perform unauthenticated fetch
      return this.fetcher.fetch(url, {
        ...requestInit,
        headers: flattenHeaders(requestInitiWithDefaults.headers)
      });
    }

    return this.fetcher.fetch(url, {
      ...requestInit,
      headers: {
        ...flattenHeaders(requestInitiWithDefaults.headers),
        authorization: `DPOP ${authToken}`,
        dpop: await this.dpopHeaderCreator.createHeaderToken(
          this.urlRepresentationConverter.requestInfoToUrl(url),
          requestInitiWithDefaults.method
        )
      }
    });
  }
}
