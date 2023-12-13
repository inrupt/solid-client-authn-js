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

/**
 * @hidden
 * @packageDocumentation
 */
import type { IIssuerConfigFetcher } from "./login/oidc/IIssuerConfigFetcher";
import type { ILogoutOptions, IRpLogoutOptions } from "./logout/ILogoutHandler";
import type ILogoutHandler from "./logout/ILogoutHandler";
import type ILoginHandler from "./login/ILoginHandler";
import type IIncomingRedirectHandler from "./login/oidc/IIncomingRedirectHandler";
import type { ISessionInfoManager } from "./sessionInfo/ISessionInfoManager";
import type {
  ISessionInfo,
  ISessionInternalInfo,
} from "./sessionInfo/ISessionInfo";

const boundFetch: typeof fetch = (request, init) => fetch(request, init);

/**
 * @hidden
 */
export default class ClientAuthentication {
  protected boundLogout?: (options: IRpLogoutOptions) => string;

  constructor(
    protected loginHandler: ILoginHandler,
    protected redirectHandler: IIncomingRedirectHandler,
    protected logoutHandler: ILogoutHandler,
    protected sessionInfoManager: ISessionInfoManager,
    protected issuerConfigFetcher?: IIssuerConfigFetcher,
  ) {
    this.loginHandler = loginHandler;
    this.redirectHandler = redirectHandler;
    this.logoutHandler = logoutHandler;
    this.sessionInfoManager = sessionInfoManager;
    this.issuerConfigFetcher = issuerConfigFetcher;
  }

  // By default, our fetch() resolves to the environment fetch() function.
  fetch = boundFetch;

  logout = async (
    sessionId: string,
    options?: ILogoutOptions,
  ): Promise<void> => {
    // When doing IDP logout this will redirect away from the current page, so we should not expect
    // code after this condition to be run if it is true.
    // We also need to make sure that any other cleanup that we want to do for
    // our session takes place before this condition is run
    await this.logoutHandler.handle(
      sessionId,
      options?.logoutType === "idp"
        ? {
            ...options,
            toLogoutUrl: this.boundLogout,
          }
        : options,
    );

    // Restore our fetch() function back to the environment fetch(), effectively
    // leaving us with un-authenticated fetches from now on.
    this.fetch = boundFetch;

    // Delete the bound logout function, so that it can't be called after this.
    delete this.boundLogout;
  };

  getSessionInfo = async (
    sessionId: string,
  ): Promise<(ISessionInfo & ISessionInternalInfo) | undefined> => {
    // TODO complete
    return this.sessionInfoManager.get(sessionId);
  };

  getAllSessionInfo = async (): Promise<ISessionInfo[]> => {
    return this.sessionInfoManager.getAll();
  };
}
