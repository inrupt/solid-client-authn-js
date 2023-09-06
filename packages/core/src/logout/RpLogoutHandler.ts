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
import type ILogoutHandler from "./ILogoutHandler";
import type { IRedirector } from "../login/oidc/IRedirector";
import type { ILogoutHandlerOptions } from "./ILogoutHandler";

export default class IRpLogoutHandler implements ILogoutHandler {
  constructor(protected redirector: IRedirector) {
    this.redirector = redirector;
  }

  async canHandle(
    userId: string,
    options?: ILogoutHandlerOptions | undefined,
  ): Promise<boolean> {
    return options?.logoutType === "idp";
  }

  async handle(
    userId: string,
    options?: ILogoutHandlerOptions | undefined,
  ): Promise<void> {
    if (options?.logoutType !== "idp") {
      throw new Error(
        "Attempting to call idp logout handler to perform app logout",
      );
    }

    if (options.toLogoutUrl === undefined) {
      throw new Error(
        "Cannot perform IDP logout. Did you log in using the OIDC authentication flow?",
      );
    }

    this.redirector.redirect(options.toLogoutUrl(options), {
      handleRedirect: options.handleRedirect,
    });
  }
}
