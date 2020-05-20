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

  it("Properly follows the refresh flow", async () => {
    defaultMocks.storageUtility.getForUser.mockResolvedValueOnce(
      "thisIsARefreshToken"
    );
    defaultMocks.storageUtility.getForUser.mockResolvedValueOnce(
      "https://idp.com"
    );
    defaultMocks.storageUtility.getForUser.mockResolvedValueOnce("coolApp");
    defaultMocks.storageUtility.getForUser.mockResolvedValueOnce(null);
    const issuerConfig = {
      ...IssuerConfigFetcherFetchConfigResponse,
      // eslint-disable-next-line @typescript-eslint/camelcase
      grantTypesSupported: ["refresh_token"]
    };
    defaultMocks.issueConfigFetcher.fetchConfig.mockResolvedValueOnce(
      issuerConfig
    );
    const TokenRefresher = getTokenRefresher();
    await TokenRefresher.refresh("global");
    expect(defaultMocks.fetcher.fetch).toBeCalledWith(
      issuerConfig.tokenEndpoint,
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
});
