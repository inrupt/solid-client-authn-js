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
   * The URL to redirect back to when RP initiated logout is completed.
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

// export interface IRpLogoutHandlerOptions extends IRpLogoutOptions {
//   /**
//    * Generate url from IRpLogoutOptions
//    */
//   toLogoutUrl?: ({ state, postLogoutUrl }: IRpLogoutOptions) => string;
// }

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
// export type ILogoutHandlerOptions = IRpLogoutHandlerOptions | IAppLogoutOptions;

/**
 * @hidden
 */
type ILogoutHandler = IHandleable<
  [string] | [string, ILogoutHandlerOptions | undefined],
  void
>;
export default ILogoutHandler;
