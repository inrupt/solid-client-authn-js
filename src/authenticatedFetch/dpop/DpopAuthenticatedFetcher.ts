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
import IDpopRequestCredentials from "../../dpop/IDpopRequestCredentials";
import { injectable, inject } from "tsyringe";
import { IFetcher } from "../../util/Fetcher";
import { IDpopHeaderCreator } from "../../dpop/DpopHeaderCreator";
import { IUrlRepresentationConverter } from "../../util/UrlRepresenationConverter";
import { IStorageUtility } from "../../localStorage/StorageUtility";

/**
 * @internal
 * This method is a temporary fix: as per the MDN spec (https://developer.mozilla.org/en-US/docs/Web/API/Headers),
 * the Headers object should have a `.keys()` method. It turns out that some implementations
 * do not implement this method, so this check is necessary to verify how to access
 * the header's content.
 * @param headers A header potentially of the type provided by LDflex-Comunica
 */
function hasKeys(
  headers: Headers | string[][] | Record<string, string> | undefined | unknown
): headers is Headers | string[][] {
  return (
    // eslint-disable-next-line
    // @ts-ignore
    headers !== undefined && headers.keys !== undefined
  );
}

/**
 * @internal
 * This method is a temporary fix: we receive from LDflex-Comunica an object
 * that is not conform to the Headers interface. This mitigates the issue
 * until a cleaner fix is found. This method may be seen as a type guard for
 * a LDflex-Comunica header.
 * @param headers A header potentially of the type provided by LDflex-Comunica
 */
function hasRawGetter(
  // The 'any' type here is needed because no type definition covers properly
  // the headers object we want to check against here.
  // eslint-disable-next-line
  headers: any
): boolean {
  return (
    // eslint-disable-next-line
    // @ts-ignore
    headers !== undefined && headers.raw !== undefined
  );
}

/**
 * @internal
 * This function feels unnecessarily complicated, but is required in order to
 * have Headers according to type definitions in both Node and browser environments.
 * This might require a fix upstream to be cleaned up.
 *
 * @param headersToFlatten A structure containing headers potentially in several formats
 */
export function flattenHeaders(
  headersToFlatten: Headers | string[][] | Record<string, string> | undefined
): Record<string, string> {
  if (headersToFlatten === undefined) {
    return {};
  }
  const flatHeaders: Record<string, string> = {};
  if (!hasKeys(headersToFlatten)) {
    if (hasRawGetter(headersToFlatten)) {
      // This is needed because the headers object passed by Comunica do not
      // align with either `node-fetch::Headers` or `lib.dom.d.ts::Headers`,
      // and gets mangled if passed as is to cross-fetch.
      // eslint-disable-next-line
      // @ts-ignore
      return headersToFlatten.raw();
    } else {
      return headersToFlatten as Record<string, string>;
    }
  } else {
    // headersToFlatten.keys() SHOULD be valid as per the Headers spec. This seems to be an issue
    // in lib.dom.d.ts that will need some investigation and potentially a contrib upstream.
    // eslint-disable-next-line
    // @ts-ignore
    for (const key of headersToFlatten.keys()) {
      // Similar as the previous @ts-ignore
      // eslint-disable-next-line
      // @ts-ignore
      flatHeaders[key] = headersToFlatten.get(key);
    }
  }
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
