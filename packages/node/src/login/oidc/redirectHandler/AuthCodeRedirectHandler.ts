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

import { inject, injectable } from "tsyringe";
import {
  IClientRegistrar,
  IIssuerConfigFetcher,
  IRedirectHandler,
  ISessionInfo,
  ISessionInfoManager,
  IStorageUtility,
  NotImplementedError,
} from "@inrupt/solid-client-authn-core";
import { URL } from "url";
import { fetchType } from "../../../authenticatedFetch/fetchFactory";

/**
 * @hidden
 */
@injectable()
export class AuthCodeRedirectHandler implements IRedirectHandler {
  constructor(
    @inject("storageUtility") private storageUtility: IStorageUtility,
    @inject("sessionInfoManager")
    private _sessionInfoManager: ISessionInfoManager,
    @inject("issuerConfigFetcher")
    private _issuerConfigFetcher: IIssuerConfigFetcher,
    @inject("clientRegistrar") private _clientRegistrar: IClientRegistrar
  ) {}

  async canHandle(redirectUrl: string): Promise<boolean> {
    try {
      const myUrl = new URL(redirectUrl);
      return (
        myUrl.searchParams.get("code") !== null &&
        myUrl.searchParams.get("state") !== null
      );
    } catch (e) {
      throw new Error(
        `[${redirectUrl}] is not a valid URL, and cannot be used as a redirect URL: ${e.toString()}`
      );
    }
  }

  async handle(
    redirectUrl: string
  ): Promise<ISessionInfo & { fetch: fetchType }> {
    if (!(await this.canHandle(redirectUrl))) {
      throw new Error(
        `AuthCodeRedirectHandler cannot handle [${redirectUrl}]: it is missing one of [code, state].`
      );
    }

    throw new NotImplementedError(
      "AuthCodeRedirectHandler not implemented for Node"
    );
  }
}
