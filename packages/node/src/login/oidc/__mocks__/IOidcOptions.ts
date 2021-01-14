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

import { IOidcOptions } from "@inrupt/solid-client-authn-core";

export const standardOidcOptions: IOidcOptions = {
  sessionId: "mySession",
  issuer: "https://example.com",
  dpop: true,
  redirectUrl: "https://app.example.com",
  handleRedirect: jest.fn((url) => url),
  // This will be fixed in a different pull request
  issuerConfiguration: {
    issuer: "https://example.com",
    authorizationEndpoint: "https://example.com/auth",
    tokenEndpoint: "https://example.com/token",
    jwksUri: "https://example.com/jwks",
    subjectTypesSupported: [],
    claimsSupported: [],
  },
  client: {
    clientId: "coolApp",
  },
};

export const mockDefaultOidcOptions = (): IOidcOptions => {
  return { ...standardOidcOptions };
};

export const mockOidcOptions = (
  overriddenOptions: Partial<IOidcOptions>
): IOidcOptions => {
  return {
    ...standardOidcOptions,
    ...overriddenOptions,
  };
};
