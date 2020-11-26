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

import { IdTokenClaims, TokenSet } from "openid-client";
import { ITokenRefresher } from "../TokenRefresher";

// Some identifiers are in camelcase on purpose.
/* eslint-disable camelcase */

export const mockTokenRefresher = (
  tokenSet: TokenSet & { access_token: string }
): ITokenRefresher => {
  return {
    refresh: async () => tokenSet,
  };
};

const mockIdTokenPayload = (): IdTokenClaims => {
  return {
    sub: "https://my.webid",
    iss: "https://my.idp/",
    aud: "https://resource.example.org",
    exp: 1662266216,
    iat: 1462266216,
  };
};

export const mockDefaultTokenSet = (): TokenSet & { access_token: string } => {
  return {
    access_token: "some refreshed access token",
    expired: () => false,
    claims: mockIdTokenPayload,
  };
};

export const mockDefaultTokenRefresher = (): ITokenRefresher =>
  mockTokenRefresher(mockDefaultTokenSet());
