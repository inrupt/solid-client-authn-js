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

import "reflect-metadata";
import { Response as NodeResponse, fetch } from "cross-fetch";
import {
  IIssuerConfig,
  mockStorageUtility,
} from "@inrupt/solid-client-authn-core";
import {
  IssuerConfigFetcherMock,
  IssuerConfigFetcherFetchConfigResponse,
} from "./__mocks__/IssuerConfigFetcher";
import TokenRequester from "./TokenRequester";
import {
  ClientRegistrarMock,
  PublicClientRegistrarMock,
} from "./__mocks__/ClientRegistrar";

jest.mock("cross-fetch");

describe("TokenRequester", () => {
  const defaultMocks = {
    storageUtility: mockStorageUtility({}),
    issueConfigFetcher: IssuerConfigFetcherMock,
    clientRegistrar: ClientRegistrarMock,
  };

  function getTokenRequester(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): TokenRequester {
    return new TokenRequester(
      mocks.storageUtility ?? defaultMocks.storageUtility,
      mocks.issueConfigFetcher ?? defaultMocks.issueConfigFetcher,
      mocks.clientRegistrar ?? ClientRegistrarMock
    );
  }

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
    values: Partial<typeof defaultReturnValues>
  ): Promise<typeof fetch> {
    await defaultMocks.storageUtility.setForUser("global", {
      issuer: values.storageIdp ?? defaultReturnValues.storageIdp,
    });

    const issuerConfig =
      values.issuerConfig ?? defaultReturnValues.issuerConfig;
    defaultMocks.issueConfigFetcher.fetchConfig.mockResolvedValueOnce(
      issuerConfig
    );

    const mockedFetch = jest
      .requireMock("cross-fetch")
      .mockResolvedValueOnce(
        new NodeResponse(
          values.responseBody ?? defaultReturnValues.responseBody
        ) as unknown as Response
      );
    return mockedFetch;
  }

  it("the refresh flow isn't implemented", async () => {
    await setUpMockedReturnValues({});
    const TokenRefresher = getTokenRequester({
      clientRegistrar: PublicClientRegistrarMock,
    });
    /* eslint-disable camelcase */
    await expect(
      TokenRefresher.request("global", {
        grant_type: "refresh_token",
        refresh_token: "thisIsARefreshToken",
      })
    ).rejects.toThrow("not implemented");
    /* eslint-enable camelcase */
  });
});
