/**
 * This project is a continuation of Inrupt's awesome solid-auth-fetcher project,
 * see https://www.npmjs.com/package/@inrupt/solid-auth-fetcher.
 * Copyright 2020 The Solid Project.
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

import ISolidSession from "../../../solidSession/ISolidSession";
import IRedirectHandler from "./IRedirectHandler";
import URL from "url-parse";
import ConfigurationError from "../../..//errors/ConfigurationError";
import { inject, injectable } from "tsyringe";
import { IStorageUtility } from "../../../localStorage/StorageUtility";
import { IRedirector } from "../Redirector";
import { ITokenRequester } from "../TokenRequester";
import { ISessionCreator } from "../../../solidSession/SessionCreator";

@injectable()
export default class AuthCodeRedirectHandler implements IRedirectHandler {
  constructor(
    @inject("storageUtility") private storageUtility: IStorageUtility,
    @inject("redirector") private redirector: IRedirector,
    @inject("tokenRequester") private tokenRequester: ITokenRequester,
    @inject("sessionCreator") private sessionCreator: ISessionCreator
  ) {}

  async canHandle(redirectUrl: string): Promise<boolean> {
    const url = new URL(redirectUrl, true);
    return !!(url.query && url.query.code && url.query.state);
  }

  async handle(redirectUrl: string): Promise<ISolidSession> {
    if (!(await this.canHandle(redirectUrl))) {
      throw new ConfigurationError(`Cannot handle redirect url ${redirectUrl}`);
    }
    const url = new URL(redirectUrl, true);
    const localUserId = url.query.state as string;
    const [codeVerifier, redirectUri] = await Promise.all([
      (await this.storageUtility.getForUser(
        localUserId,
        "codeVerifier",
        true
      )) as string,
      (await this.storageUtility.getForUser(
        localUserId,
        "redirectUri",
        true
      )) as string
    ]);

    /* eslint-disable @typescript-eslint/camelcase */
    await this.tokenRequester.request(localUserId, {
      grant_type: "authorization_code",
      code_verifier: codeVerifier as string,
      code: url.query.code as string,
      redirect_uri: redirectUri as string
    });
    /* eslint-enable @typescript-eslint/camelcase */

    url.set("query", {});

    const session = await this.sessionCreator.getSession(localUserId);
    if (!session) {
      throw new Error("There was a problem creating a session.");
    }
    session.neededAction = this.redirector.redirect(url.toString(), {
      redirectByReplacingState: true
    });

    return session;
  }
}
