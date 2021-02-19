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
 * Defines the data that should be persisted for each session. This interface
 * is exposed as part of our public API.
 */
export interface ISessionInfo {
  /**
   * 'true' if the session is currently logged into an associated identity
   * provider.
   */
  isLoggedIn: boolean;

  /**
   * The WebID if the user is logged into the session, and undefined if not.
   */
  webId?: string;

  /**
   * The WebID of the app, or a "Public app" WebID if the app does not provide its own.
   * undefined until the session is logged in and the app WebID has been verified.
   */
  clientAppId?: string;

  /**
   * A unique identifier for the session.
   */
  sessionId: string;

  /**
   * UNIX timestamp (number of milliseconds since Jan 1st 1970) representing the
   * time until which this session is valid.
   */
  expirationDate?: number;
}

/**
 * Captures information about sessions that is persisted in storage, but that
 * should not be exposed as part of our public API, and is only used for internal
 * purpose. It is complementary to ISessionInfo when retrieving all information
 * about a stored session, both public and internal.
 */
export interface ISessionInternalInfo {
  /**
   * The ID token associated with the session (if any).
   */
  idToken?: string;

  /**
   * The refresh token associated with the session (if any).
   */
  refreshToken?: string;

  /**
   * The OIDC issuer that issued the tokens authenticating the session.
   */
  issuer?: string;

  /**
   * The redirect URL registered when initially logging the session in.
   */
  redirectUrl?: string;

  /**
   * For public clients, and Solid Identity Providers that do not support Client
   * WebIDs, the client secret is still required at the token endpoint.
   */
  clientAppSecret?: string;
}
