/*
 * Copyright 2022 Inrupt Inc.
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

import {
  IIssuerConfig,
  IIssuerConfigFetcher,
} from "@inrupt/solid-client-authn-core";
import { jest } from "@jest/globals";

export const IssuerConfigFetcherFetchConfigResponse: IIssuerConfig = {
  issuer: "https://idp.com",
  authorizationEndpoint: "https://idp.com/auth",
  tokenEndpoint: "https://idp.com/token",
  jwksUri: "https://idp.com/jwks",
  subjectTypesSupported: [],
  claimsSupported: [],
  grantTypesSupported: ["refresh_token"],
  idTokenSigningAlgValuesSupported: ["RS256"],
  scopesSupported: ["openid", "offline_access"],
};

export const IssuerConfigFetcherMock: jest.Mocked<IIssuerConfigFetcher> = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fetchConfig: jest.fn((_issuer: string) =>
    Promise.resolve(IssuerConfigFetcherFetchConfigResponse)
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

export const mockDefaultIssuerConfigFetcher = (): IIssuerConfigFetcher => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchConfig: (jest.fn() as any).mockResolvedValue(
      IssuerConfigFetcherFetchConfigResponse
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
};

export const mockIssuerConfigFetcher = (
  config: IIssuerConfig
): IIssuerConfigFetcher => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchConfig: (jest.fn() as any).mockResolvedValue(config),
  };
};
