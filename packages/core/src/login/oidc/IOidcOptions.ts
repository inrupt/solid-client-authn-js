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

/**
 * @hidden
 * @packageDocumentation
 */

/**
 * Defines how OIDC login should proceed
 */
import { IIssuerConfig } from "./IIssuerConfig";
import { IClient } from "./IClient";

/**
 * @hidden
 */
export interface IOidcOptions {
  /**
   * The URL of the Solid Identity Provider.
   */
  issuer: string;
  /**
   * The openid-configuration of the issuer.
   */
  issuerConfiguration: IIssuerConfig;
  client: IClient;
  sessionId: string;
  refreshToken?: string;
  /**
   * Specify whether the Solid Identity Provider may, or may not, interact with the user (for example,
   * the normal login process **_requires_** human interaction for them to enter their credentials,
   * but if a user simply refreshes the current page in their browser, we'll want to log them in again
   * automatically, i.e., without prompting them to manually provide their credentials again).
   */
  prompt?: string;
  /**
   * True if a DPoP compatible auth_token should be requested.
   */
  dpop: boolean;
  /**
   * The URL to which the user should be redirected after logging in the Solid
   * Identity Provider and authorizing the app to access data in their stead.
   */
  redirectUrl: string;
  handleRedirect?: (url: string) => unknown;
}

export default IOidcOptions;
