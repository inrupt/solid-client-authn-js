//
// Copyright Inrupt Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
// Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
import type { ILogoutHandlerOptions } from "./ILogoutHandler";
import type ILogoutHandler from "./ILogoutHandler";
import GeneralLogoutHandler from "./GeneralLogoutHandler";
import IRpLogoutHandler from "./RpLogoutHandler";
import type { ISessionInfoManager } from "../sessionInfo/ISessionInfoManager";
import type { IRedirector } from "../login/oidc/IRedirector";

export default class IWaterfallLogoutHandler implements ILogoutHandler {
  private handlers: ILogoutHandler[];

  constructor(
    sessionInfoManager: ISessionInfoManager,
    redirector: IRedirector,
  ) {
    this.handlers = [
      new GeneralLogoutHandler(sessionInfoManager),
      new IRpLogoutHandler(redirector),
    ];
  }

  async canHandle(): Promise<boolean> {
    return true;
  }

  async handle(
    userId: string,
    options?: ILogoutHandlerOptions | undefined,
  ): Promise<void> {
    for (const handler of this.handlers) {
      /* eslint-disable no-await-in-loop */
      if (await handler.canHandle(userId, options))
        await handler.handle(userId, options);
      /* eslint-enable no-await-in-loop */
    }
  }
}
