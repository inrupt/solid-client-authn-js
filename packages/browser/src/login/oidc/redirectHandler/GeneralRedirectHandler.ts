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

import {
  IRedirectHandler,
  ISessionInfo,
  ISessionInfoManager,
} from "@inrupt/solid-client-authn-core";
import URL from "url-parse";
import { inject, injectable } from "tsyringe";
import { ITokenSaver } from "./TokenSaver";
import { buildBearerFetch } from "../../../authenticatedFetch/fetchFactory";
import { getUnauthenticatedSession } from "../../../sessionInfo/SessionInfoManager";

/**
 * @hidden
 */
@injectable()
export default class GeneralRedirectHandler implements IRedirectHandler {
  constructor(
    @inject("tokenSaver") private tokenSaver: ITokenSaver,
    @inject("sessionInfoManager")
    private sessionInfoManager: ISessionInfoManager
  ) {}

  async canHandle(redirectUrl: string): Promise<boolean> {
    const url = new URL(redirectUrl, true);
    return !!(
      url.query &&
      url.query.id_token &&
      url.query.access_token &&
      url.query.state
    );
  }
  async handle(
    redirectUrl: string
  ): Promise<ISessionInfo & { fetch: typeof fetch }> {
    if (!(await this.canHandle(redirectUrl))) {
      // If the received IRI does not have redirection information, we can only
      // return an unauthenticated session.
      return getUnauthenticatedSession();
    }
    const url = new URL(redirectUrl, true);

    await this.tokenSaver.saveSession(
      url.query.state as string,
      url.query.id_token as string,
      url.query.access_token
    );
    const sessionId = url.query.state as string;
    const sessionInfo = await this.sessionInfoManager.get(sessionId);
    if (url.query.access_token === undefined) {
      throw new Error(
        `No access token is present in the redirect URL: [${url.toString()}]`
      );
    }
    return Object.assign(sessionInfo, {
      fetch: buildBearerFetch(url.query.access_token),
    });
  }
}
