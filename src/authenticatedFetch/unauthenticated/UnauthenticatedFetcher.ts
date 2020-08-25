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
 * @hidden
 * @packageDocumentation
 */

/**
 * Responsible for sending DPoP Enabled requests
 */
import IAuthenticatedFetcher from "../IAuthenticatedFetcher";
import IRequestCredentials from "../IRequestCredentials";
import { injectable, inject } from "tsyringe";
import { IFetcher } from "../../util/Fetcher";
import { IUrlRepresentationConverter } from "../../util/UrlRepresenationConverter";
import { IStorageUtility } from "../../storage/StorageUtility";

/**
 * @hidden
 */
@injectable()
export default class DpopAuthenticatedFetcher implements IAuthenticatedFetcher {
  constructor(
    @inject("fetcher") private fetcher: IFetcher,
    @inject("urlRepresentationConverter")
    private urlRepresentationConverter: IUrlRepresentationConverter,
    @inject("storageUtility") private storageUtility: IStorageUtility
  ) {}

  /**
   * The UnauthenticatedFetcher requires no particular condition to handle a fetch.
   * It means that it should be registered last as a potential handler, so that
   * more specific handlers may be found before this "catch-all" one.
   *
   * @param requestCredentials
   * @param url
   * @param requestInit
   */
  async canHandle(
    // This method being generic, it has arguments that are not used in this
    // specific context, which is why eslint needs to be disabled.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    requestCredentials: IRequestCredentials,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    url: RequestInfo,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    requestInit?: RequestInit
  ): Promise<boolean> {
    return true;
  }

  async handle(
    requestCredentials: IRequestCredentials,
    url: RequestInfo,
    requestInit?: RequestInit
  ): Promise<Response> {
    return this.fetcher.fetch(url, {
      ...requestInit,
      method: requestInit?.method ?? "GET",
      headers: requestInit?.headers,
    });
  }
}
