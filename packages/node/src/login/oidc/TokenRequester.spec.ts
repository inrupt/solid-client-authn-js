//
// Copyright Inrupt Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
// Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

import { jest, it, describe, expect } from "@jest/globals";
import type { IIssuerConfig } from "@inrupt/solid-client-authn-core";
import { mockStorageUtility } from "@inrupt/solid-client-authn-core";
import {
  IssuerConfigFetcherMock,
  IssuerConfigFetcherFetchConfigResponse,
} from "./__mocks__/IssuerConfigFetcher";
import TokenRequester from "./TokenRequester";
import { ClientRegistrarMock } from "./__mocks__/ClientRegistrar";

describe("TokenRequester", () => {
  const defaultMocks = {
    storageUtility: mockStorageUtility({}),
    issueConfigFetcher: IssuerConfigFetcherMock,
    clientRegistrar: ClientRegistrarMock,
  };

  const defaultReturnValues: {
    storageIdp: string;
    issuerConfig: IIssuerConfig;
    responseBody: string;
    jwt: Record<string, string>;
  } = {
    storageIdp: "https://idp.com",

    issuerConfig: {
      ...IssuerConfigFetcherFetchConfigResponse,
      grantTypesSupported: ["refresh_token"],
    },

    responseBody: JSON.stringify({
      /* eslint-disable camelcase */
      id_token: "abcd",
      access_token: "1234",
      refresh_token: "!@#$",
      /* eslint-enable camelcase */
    }),

    jwt: {
      sub: "https://jackson.solid.community/profile/card#me",
    },
  };

  async function setUpMockedReturnValues(
    values: Partial<typeof defaultReturnValues>,
  ) {
    await defaultMocks.storageUtility.setForUser("global", {
      issuer: values.storageIdp ?? defaultReturnValues.storageIdp,
    });

    const issuerConfig =
      values.issuerConfig ?? defaultReturnValues.issuerConfig;
    defaultMocks.issueConfigFetcher.fetchConfig.mockResolvedValueOnce(
      issuerConfig,
    );

    const mockedFetch = jest.spyOn(globalThis, "fetch");
    mockedFetch.mockResolvedValueOnce(
      new Response(values.responseBody ?? defaultReturnValues.responseBody),
    );
    return mockedFetch;
  }

  it("the refresh flow isn't implemented", async () => {
    await setUpMockedReturnValues({});
    const TokenRefresher = new TokenRequester();
    /* eslint-disable camelcase */
    await expect(
      TokenRefresher.request("global", {
        grant_type: "refresh_token",
        refresh_token: "thisIsARefreshToken",
      }),
    ).rejects.toThrow("not implemented");
    /* eslint-enable camelcase */
  });
});
