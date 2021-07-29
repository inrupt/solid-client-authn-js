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

import { KeyPair } from "../../../authenticatedFetch/dpopUtils";

/**
 * Based on openid-client's TokenSetParameters. Re-creating the type allows not
 * to depend on the Node-specific library at the environment-agnostic level.
 */
export type TokenEndpointResponse = {
  /**
   * JWT-serialized access token
   */
  accessToken: string;
  /**
   * Usually "Bearer"
   */
  tokenType?: "Bearer" | "DPoP";
  /**
   * JWT-serialized id token
   */
  idToken?: string;
  /**
   * Refresh token (not necessarily a JWT)
   */
  refreshToken?: string;

  /**
   * Expiration of the access token.
   */
  expiresAt?: number;
};

export interface ITokenRefresher {
  refresh(
    localUserId: string,
    refreshToken?: string,
    dpopKey?: KeyPair,
    onNewRefreshToken?: (token: string) => unknown
  ): Promise<TokenEndpointResponse>;
}
