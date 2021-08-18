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

import {
  IIssuerConfig,
  IIssuerConfigFetcher,
} from "@inrupt/solid-client-authn-core";
import { jest } from "@jest/globals";
import { IssuerMetadata } from "openid-client";
import { configFromIssuerMetadata } from "../IssuerConfigFetcher";

export const IssuerConfigFetcherFetchConfigResponse: IIssuerConfig = {
  issuer: "https://idp.com",
  authorizationEndpoint: "https://idp.com/auth",
  tokenEndpoint: "https://idp.com/token",
  jwksUri: "https://idp.com/jwks",
  subjectTypesSupported: [],
  claimsSupported: [],
  grantTypesSupported: ["refresh_token"],
  idTokenSigningAlgValuesSupported: ["ES256", "RS256"],
};

export const IssuerConfigFetcherMock = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fetchConfig: jest.fn((_issuer: string) =>
    Promise.resolve(IssuerConfigFetcherFetchConfigResponse)
  ),
} as unknown as jest.Mocked<IIssuerConfigFetcher>;

// Note that this returns an instance of IssuerMetadata, which is the equivalent
// of our IIssuerConfig for openid-client
export const mockDefaultIssuerMetadata = (): IssuerMetadata => {
  return {
    issuer: "https://my.idp/",
    authorization_endpoint: "https://my.idp/auth",
    token_endpoint: "https://my.idp/token",
    registration_endpoint: "https://my.idp/register",
    jwks_uri: "https://my.idp/jwks",
    claims_supported: ["sub"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["ES256", "RS256"],
    grant_types_supported: [
      "authorization_code",
      "refresh_token",
      "client_credentials",
    ],
  };
};

export const mockIssuerMetadata = (
  config: Partial<IssuerMetadata>
): IssuerMetadata => {
  return {
    ...mockDefaultIssuerMetadata(),
    ...config,
  };
};

export const mockDefaultIssuerConfig = (): IIssuerConfig =>
  configFromIssuerMetadata(mockDefaultIssuerMetadata());
export const mockIssuerConfig = (
  config: Partial<IIssuerConfig>
): IIssuerConfig => {
  return {
    ...configFromIssuerMetadata(mockDefaultIssuerMetadata()),
    ...config,
  };
};

export function mockIssuerConfigFetcher(
  config: IIssuerConfig
): IIssuerConfigFetcher {
  return {
    fetchConfig: async (): Promise<IIssuerConfig> => config,
  };
}
