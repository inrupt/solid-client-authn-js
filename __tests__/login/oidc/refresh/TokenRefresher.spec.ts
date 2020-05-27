/**
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

import "reflect-metadata";
import TokenRefresher from "../../../../src/login/oidc/refresh/TokenRefresher";
import { FetcherMock } from "../../../../src/util/__mocks__/Fetcher";
import {
  IssuerConfigFetcherMock,
  IssuerConfigFetcherFetchConfigResponse
} from "../../../../src/login/oidc/__mocks__/IssuerConfigFetcher";
import { StorageUtilityMock } from "../../../../src/localStorage/__mocks__/StorageUtility";
import {
  DpopHeaderCreatorMock,
  DpopHeaderCreatorResponse
} from "../../../../src/dpop/__mocks__/DpopHeaderCreator";
import { Response as NodeResponse } from "node-fetch";
import IIssuerConfig from "../../../../src/login/oidc/IIssuerConfig";

describe("TokenRefresher", () => {
  const defaultMocks = {
    fetcher: FetcherMock,
    issueConfigFetcher: IssuerConfigFetcherMock,
    storageUtility: StorageUtilityMock,
    dpopHeaderCreator: DpopHeaderCreatorMock
  };
  function getTokenRefresher(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): TokenRefresher {
    return new TokenRefresher(
      mocks.fetcher ?? defaultMocks.fetcher,
      mocks.issueConfigFetcher ?? defaultMocks.issueConfigFetcher,
      mocks.storageUtility ?? defaultMocks.storageUtility,
      mocks.dpopHeaderCreator ?? defaultMocks.dpopHeaderCreator
    );
  }

  const defaultReturnValues: {
    storageRefreshToken: string;
    storageIdp: string;
    storageClientId: string;
    storageClientSecret: string | null;
    issuerConfig: IIssuerConfig;
    responseBody: string;
  } = {
    storageRefreshToken: "thisIsARefreshToken",
    storageIdp: "https://idp.com",
    storageClientId: "coolApp",
    storageClientSecret: null,
    issuerConfig: {
      ...IssuerConfigFetcherFetchConfigResponse,
      // eslint-disable-next-line @typescript-eslint/camelcase
      grantTypesSupported: ["refresh_token"]
    },
    responseBody: JSON.stringify({
      // eslint-disable-next-line @typescript-eslint/camelcase
      id_token: "abcd",
      // eslint-disable-next-line @typescript-eslint/camelcase
      access_token: "1234",
      // eslint-disable-next-line @typescript-eslint/camelcase
      refresh_token: "!@#$"
    })
  };
  function setUpMockedReturnValues(
    values: Partial<typeof defaultReturnValues>
  ): void {
    defaultMocks.storageUtility.getForUser.mockResolvedValueOnce(
      values.storageRefreshToken ?? defaultReturnValues.storageRefreshToken
    );
    defaultMocks.storageUtility.getForUser.mockResolvedValueOnce(
      values.storageIdp ?? defaultReturnValues.storageIdp
    );
    defaultMocks.storageUtility.getForUser.mockResolvedValueOnce(
      values.storageClientId ?? defaultReturnValues.storageClientId
    );
    defaultMocks.storageUtility.getForUser.mockResolvedValueOnce(
      values.storageClientSecret ?? defaultReturnValues.storageClientSecret
    );
    const issuerConfig =
      values.issuerConfig ?? defaultReturnValues.issuerConfig;
    defaultMocks.issueConfigFetcher.fetchConfig.mockResolvedValueOnce(
      issuerConfig
    );
    defaultMocks.fetcher.fetch.mockResolvedValueOnce(
      (new NodeResponse(
        values.responseBody ?? defaultReturnValues.responseBody
      ) as unknown) as Response
    );
  }

  it("Properly follows the refresh flow", async () => {
    setUpMockedReturnValues({});
    const TokenRefresher = getTokenRefresher();
    await TokenRefresher.refresh("global");
    expect(defaultMocks.fetcher.fetch).toBeCalledWith(
      IssuerConfigFetcherFetchConfigResponse.tokenEndpoint,
      {
        method: "POST",
        headers: {
          DPoP: DpopHeaderCreatorResponse,
          "content-type": "application/x-www-form-urlencoded"
        },
        body:
          "client_id=coolApp&grant_type=refresh_token&refresh_token=thisIsARefreshToken"
      }
    );
  });

  it("Adds an authorization header if a client secret is present", async () => {
    setUpMockedReturnValues({
      storageClientSecret: "theSecretSauceIsJustMayo"
    });
    const TokenRefresher = getTokenRefresher();
    await TokenRefresher.refresh("global");
    expect(defaultMocks.fetcher.fetch).toBeCalledWith(
      IssuerConfigFetcherFetchConfigResponse.tokenEndpoint,
      {
        method: "POST",
        headers: {
          DPoP: DpopHeaderCreatorResponse,
          Authorization: "Basic Y29vbEFwcDp0aGVTZWNyZXRTYXVjZUlzSnVzdE1heW8=",
          "content-type": "application/x-www-form-urlencoded"
        },
        body:
          "client_id=coolApp&grant_type=refresh_token&refresh_token=thisIsARefreshToken"
      }
    );
  });

  it("Fails elegantly if the idp returns a bad value", async () => {
    setUpMockedReturnValues({
      responseBody: JSON.stringify({
        // eslint-disable-next-line @typescript-eslint/camelcase
        id_token: "ohNoThereIsNoAccessToken"
      })
    });
    const TokenRefresher = getTokenRefresher();
    await expect(TokenRefresher.refresh("global")).rejects.toThrowError(
      "IDP token route returned an invalid response."
    );
  });

  it("Fails elegantly if the issuer does not support refresh tokens", async () => {
    setUpMockedReturnValues({
      issuerConfig: {
        ...IssuerConfigFetcherFetchConfigResponse,
        // eslint-disable-next-line @typescript-eslint/camelcase
        grantTypesSupported: ["id_token"]
      }
    });
    const TokenRefresher = getTokenRefresher();
    await expect(TokenRefresher.refresh("global")).rejects.toThrowError(
      "The issuer https://idp.com does not support the refresh token grant"
    );
  });

  it("Fails elegantly if the issuer does not have a token endpoint", async () => {
    setUpMockedReturnValues({
      issuerConfig: {
        ...IssuerConfigFetcherFetchConfigResponse,
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore This is ignored to test an edge case
        tokenEndpoint: null,
        // eslint-disable-next-line @typescript-eslint/camelcase
        grantTypesSupported: ["refresh_token"]
      }
    });
    const TokenRefresher = getTokenRefresher();
    await expect(TokenRefresher.refresh("global")).rejects.toThrowError(
      "This issuer https://idp.com does not have a token endpoint"
    );
  });
});
