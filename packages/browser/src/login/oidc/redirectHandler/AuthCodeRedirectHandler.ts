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

import URL from "url-parse";
import ConfigurationError from "../../..//errors/ConfigurationError";
import { inject, injectable } from "tsyringe";
import { ITokenRequester } from "../TokenRequester";
import {
  IRedirector,
  IRedirectHandler,
  ISessionInfo,
  ISessionInfoManager,
  IStorageUtility,
} from "@inrupt/solid-client-authn-core";

/**
 * @hidden
 */
@injectable()
export default class AuthCodeRedirectHandler implements IRedirectHandler {
  constructor(
    @inject("storageUtility") private storageUtility: IStorageUtility,
    @inject("redirector") private redirector: IRedirector,
    @inject("tokenRequester") private tokenRequester: ITokenRequester,
    @inject("sessionInfoManager")
    private sessionInfoManager: ISessionInfoManager
  ) {}

  async canHandle(redirectUrl: string): Promise<boolean> {
    const url = new URL(redirectUrl, true);
    return !!(url.query && url.query.code && url.query.state);
  }

  async handle(redirectUrl: string): Promise<ISessionInfo | undefined> {
    if (!(await this.canHandle(redirectUrl))) {
      throw new ConfigurationError(
        `Cannot handle redirect url [${redirectUrl}]`
      );
    }
    const url = new URL(redirectUrl, true);
    const sessionId = url.query.state as string;
    const [codeVerifier, redirectUri] = await Promise.all([
      (await this.storageUtility.getForUser(sessionId, "codeVerifier", {
        errorIfNull: true,
      })) as string,
      (await this.storageUtility.getForUser(sessionId, "redirectUri", {
        errorIfNull: true,
      })) as string,
    ]);

    /* eslint-disable @typescript-eslint/camelcase */
    await this.tokenRequester.request(sessionId, {
      grant_type: "authorization_code",
      code_verifier: codeVerifier as string,
      code: url.query.code as string,
      redirect_uri: redirectUri as string,
    });
    /* eslint-enable @typescript-eslint/camelcase */

    url.set("query", {});

    const sessionInfo = await this.sessionInfoManager.get(sessionId);
    if (!sessionInfo) {
      throw new Error("There was a problem creating a session.");
    }
    try {
      this.redirector.redirect(url.toString(), {
        redirectByReplacingState: true,
      });
    } catch (err) {
      // Do nothing
      // This step of the flow should happen in a browser, and redirection
      // should never fail there.
    }
    return Object.assign(sessionInfo, {
      fetch: buildBearerFetch(signinResponse.access_token),
    });
  }
}
