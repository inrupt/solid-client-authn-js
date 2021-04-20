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

export default interface ILoginInputOptions {
  /**
   * The user's identity provider, e.g. `https://inrupt.net`. Usually provided by the user.
   */
  oidcIssuer?: string;
  /**
   * The URL within this application that the user should be redirected to after successful login. This can be either a web URL or a mobile URL scheme.
   */
  redirectUrl?: string;
  /**
   * A ID for your application, **previously registered to the identity provider**. Only required if users of your app log in an identity provider known a priori, which only supports a predefined set of apps and prevents [dynamic registration](https://tools.ietf.org/html/rfc7591).
   */
  clientId?: string;
  /**
   * A secret associated with your client ID during client registration to the the identity provider. Only required if users of your app log in an identity provider known a priori, which only supports a predefined set of apps and prevents [dynamic registration](https://tools.ietf.org/html/rfc7591).
   */
  clientSecret?: string;
  /**
   * Human-readable name for the client (as opposed to the client ID)
   */
  clientName?: string;
  /**
   * If true, the login process will initiate via a popup. This only works on web clients.
   */
  popUp?: boolean;
  /**
   * If a function is provided, the browser will not auto-redirect and will instead trigger that function to redirect.
   * Required in non-browser environments, ignored in the browser.
   */
  handleRedirect?: (redirectUrl: string) => unknown;
  /**
   * The type of access token you want to use. Using a cookie-based system requires Bearer tokens, but DPoP tokens provide
   * an additional safety against replay. By default, a DPoP token will be used.
   */
  tokenType?: "DPoP" | "Bearer";
  /**
   * If you already have a refresh token available, it may be used to log in along with the associated client ID and
   * secret to authenticate.
   */
  refreshToken?: string;
}
