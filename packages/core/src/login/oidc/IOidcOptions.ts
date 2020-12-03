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

/**
 * Defines how OIDC login should proceed
 */
import { IIssuerConfig } from "./IIssuerConfig";
import { IClient } from "./IClient";

/**
 * @hidden
 */
export interface ICoreOidcOptions {
  issuer: string;
  issuerConfiguration: IIssuerConfig;
  client: IClient;
  sessionId: string;
  refreshToken?: string;
}

/**
 * @hidden
 */
export interface IAccessTokenOidcOptions extends ICoreOidcOptions {
  dpop: boolean;
  redirectUrl: string;
  handleRedirect?: (url: string) => unknown;
}

/**
 * @issuer The URL of the IDP
 * @dpop True if a dpop compatible auth_token should be fetched
 * @redirectUrl The URL to which the user should be redirected after authorizing
 * @issuerConfiguration The openid-configuration of the issuer
 */
type IOidcOptions = IAccessTokenOidcOptions;
export default IOidcOptions;
