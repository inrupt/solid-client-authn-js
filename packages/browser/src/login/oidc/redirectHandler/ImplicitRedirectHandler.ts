/*
 * Copyright 2021 Inrupt Inc.
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

import {
  IRedirectHandler,
  ISessionInfo,
  ISessionInfoManager,
} from "@inrupt/solid-client-authn-core";
import { inject, injectable } from "tsyringe";
import { ITokenSaver } from "./TokenSaver";
import { buildBearerFetch } from "../../../authenticatedFetch/fetchFactory";

/**
 * @hidden
 */
@injectable()
export class ImplicitRedirectHandler implements IRedirectHandler {
  constructor(
    @inject("tokenSaver") private tokenSaver: ITokenSaver,
    @inject("sessionInfoManager")
    private sessionInfoManager: ISessionInfoManager
  ) {}

  async canHandle(redirectUrl: string): Promise<boolean> {
    try {
      const myUrl = new URL(redirectUrl);
      return (
        myUrl.searchParams.get("id_token") !== null &&
        myUrl.searchParams.get("access_token") !== null &&
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
  ): Promise<ISessionInfo & { fetch: typeof fetch }> {
    if (!(await this.canHandle(redirectUrl))) {
      throw new Error(
        `ImplicitRedirectHandler cannot handle [${redirectUrl}]: it is missing one or more of [id_token, access_token, state].`
      );
    }

    const url = new URL(redirectUrl);

    await this.tokenSaver.saveSession(
      url.searchParams.get("state") as string,
      url.searchParams.get("id_token") as string,
      url.searchParams.get("access_token") as string
    );

    // TODO: PMcB55: We don't use this flow, but *if* we do, then this should be
    //  brought back into line with the Auth Code Flow (and use a crypto-random
    //  value for 'state').
    const sessionId = url.searchParams.get("state") as string;
    const sessionInfo = await this.sessionInfoManager.get(sessionId);
    return Object.assign(sessionInfo, {
      // The canHandle check at the top of the method makes this assertion valid.
      fetch: buildBearerFetch(
        url.searchParams.get("access_token") as string,
        undefined
      ),
    });
  }
}
