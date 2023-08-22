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
import type IHandleable from "../util/handlerPattern/IHandleable";

export interface IRpLogoutOptions {
  /**
   * Log out with through from the RP.
   */
  logoutType: "idp";
  /**
   * An optional URL to redirect to after idp logout has completed;
   * this MUST match a logout URL listed in the
   * [Client ID Document](https://docs.inrupt.com/ess/latest/security/authentication/#client-identifier-client-id)
   * of the application that is logged in.
   *
   * If the application is logged in with a Client ID that is not
   * a URI dereferencing to a Client ID Document then users will
   * not be redirected back to the `postLogoutUrl` after logout.
   */
  postLogoutUrl?: string | undefined;
  /**
   * The value that should be provided in the `state` query parameter when redirecting
   * back to the postLogoutUrl.
   *
   * Note: This parameter should only be provided when a postLogoutUrl is provided. If
   * this value is provided then you should clear it from the URL when redirected back
   * to the postLogoutUrl.
   */
  state?: string | undefined;
  /**
   * If a function is provided, the browser will not auto-redirect and will instead trigger that function to redirect.
   * Required in non-browser environments, ignored in the browser.
   */
  handleRedirect?: ((redirectUrl: string) => void) | undefined;
}

export interface IAppLogoutOptions {
  /**
   * Logout within the application only.
   */
  logoutType: "app";
  postLogoutUrl?: undefined;
  state?: undefined;
  handleRedirect?: undefined;
}

export type ILogoutOptions = IRpLogoutOptions | IAppLogoutOptions;
export type ILogoutHandlerOptions = ILogoutOptions & {
  /**
   * Generate url from IRpLogoutOptions
   */
  toLogoutUrl?: ({ state, postLogoutUrl }: IRpLogoutOptions) => string;
};

/**
 * @hidden
 */
type ILogoutHandler = IHandleable<
  [string] | [string, ILogoutHandlerOptions | undefined],
  void
>;
export default ILogoutHandler;
