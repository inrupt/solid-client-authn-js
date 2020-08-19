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

import ISessionInfo from "../../../sessionInfo/ISessionInfo";
import IRedirectHandler from "./IRedirectHandler";
import URL from "url-parse";
import ConfigurationError from "../../..//errors/ConfigurationError";
import { inject, injectable } from "tsyringe";
import { ITokenSaver } from "./TokenSaver";
import { ISessionInfoManager } from "../../../sessionInfo/SessionInfoManager";

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
  async handle(redirectUrl: string): Promise<ISessionInfo | undefined> {
    if (!(await this.canHandle(redirectUrl))) {
      throw new ConfigurationError(
        `Cannot handle redirect url [${redirectUrl}]`
      );
    }
    const url = new URL(redirectUrl, true);

    await this.tokenSaver.saveTokenAndGetSession(
      url.query.state as string,
      url.query.id_token as string,
      url.query.access_token
    );
    const sessionId = url.query.state as string;
    return await this.sessionInfoManager.get(sessionId);
  }
}
