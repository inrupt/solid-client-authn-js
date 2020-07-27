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
import URL from "url-parse";
import {
  FetcherMock,
  FetcherMockResponse
} from "../../../src/util/__mocks__/Fetcher";
import {
  StorageUtilityMock,
  EmptyStorageUtilityMock
} from "../../../src/storage/__mocks__/StorageUtility";
import IssuerConfigFetcher from "../../../src/login/oidc/IssuerConfigFetcher";
import { IFetcher } from "../../../src/util/Fetcher";
import { Response as NodeResponse } from "node-fetch";

/**
 * Test for IssuerConfigFetcher
 */
describe("IssuerConfigFetcher", () => {
  const defaultMocks = {
    fetchResponse: FetcherMockResponse,
    storageUtility: StorageUtilityMock
  };
  function getIssuerConfigFetcher(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): IssuerConfigFetcher {
    FetcherMock.fetch.mockReturnValue(
      Promise.resolve(mocks.fetchResponse ?? defaultMocks.fetchResponse)
    );
    return new IssuerConfigFetcher(
      FetcherMock,
      mocks.storageUtility ?? defaultMocks.storageUtility
    );
  }

  it("should return the config stored in the storage", async () => {
    const storageMock = defaultMocks.storageUtility;
    storageMock.safeGet.mockReturnValueOnce(
      Promise.resolve({ some: "config" })
    );
    const configFetcher = getIssuerConfigFetcher({
      storageUtility: storageMock
    });

    const fetchedConfig = await configFetcher.fetchConfig(
      new URL("https://arbitrary.url")
    );

    expect(fetchedConfig).toEqual({ some: "config" });
  });

  it("should return a config based on the fetched config if none was stored in the storage", async () => {
    const fetchResponse = (new NodeResponse(
      JSON.stringify({
        issuer: "https://example.com",
        // eslint-disable-next-line @typescript-eslint/camelcase
        claim_types_supported: "oidc",
        bleepBloop: "Meep Moop"
      })
    ) as unknown) as Response;
    const configFetcher = getIssuerConfigFetcher({
      storageUtility: EmptyStorageUtilityMock,
      fetchResponse: fetchResponse
    });

    const fetchedConfig = await configFetcher.fetchConfig(
      new URL("https://arbitrary.url")
    );
    expect(fetchedConfig.issuer.protocol).toBe("https:");
    expect(fetchedConfig.issuer.toString()).toBe("https://example.com");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((fetchedConfig as any).claim_types_supported).toBeUndefined();
    expect(fetchedConfig.claimTypesSupported).toBe("oidc");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((fetchedConfig as any).bleepBloop).toBeUndefined();
  });

  it("should wrap URLs in url-parse's URL object", async () => {
    const fetchResponse = (new NodeResponse(
      /* eslint-disable @typescript-eslint/camelcase */
      JSON.stringify({
        issuer: "https://issuer.url",
        authorization_endpoint: "https://authorization_endpoint.url",
        token_endpoint: "https://token_endpoint.url",
        userinfo_endpoint: "https://userinfo_endpoint.url",
        jwks_uri: "https://jwks_uri.url",
        registration_endpoint: "https://registration_endpoint.url"
      })
      /* eslint-enable @typescript-eslint/camelcase */
    ) as unknown) as Response;
    const configFetcher = getIssuerConfigFetcher({
      storageUtility: EmptyStorageUtilityMock,
      fetchResponse: fetchResponse
    });

    const fetchedConfig = await configFetcher.fetchConfig(
      new URL("https://arbitrary.url")
    );

    expect(fetchedConfig.issuer).toEqual(new URL("https://issuer.url"));
    expect(fetchedConfig.authorizationEndpoint).toEqual(
      new URL("https://authorization_endpoint.url")
    );
    expect(fetchedConfig.tokenEndpoint).toEqual(
      new URL("https://token_endpoint.url")
    );
    expect(fetchedConfig.userinfoEndpoint).toEqual(
      new URL("https://userinfo_endpoint.url")
    );
    expect(fetchedConfig.jwksUri).toEqual(new URL("https://jwks_uri.url"));
    expect(fetchedConfig.registrationEndpoint).toEqual(
      new URL("https://registration_endpoint.url")
    );
  });

  it("should throw an error if the fetched config could not be converted to JSON", async () => {
    const mockFetcher = {
      fetch: (): Promise<Response> =>
        Promise.resolve(({
          json: () => {
            throw new Error("Some error");
          }
        } as unknown) as Response)
    };
    const configFetcher = new IssuerConfigFetcher(
      mockFetcher as IFetcher,
      EmptyStorageUtilityMock
    );

    await expect(
      configFetcher.fetchConfig(new URL("https://some.url"))
    ).rejects.toThrowError(
      "https://some.url has an invalid configuration: Some error"
    );
  });

  it("should store the config under a key specific to the config source", async () => {
    const storageUtility = defaultMocks.storageUtility;
    // This override prevents local resolution of the config
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    storageUtility.safeGet = jest.fn(async (key: string) => undefined);
    const configFetcher = getIssuerConfigFetcher({ storageUtility });

    await configFetcher.fetchConfig(new URL("https://arbitrary.url"));

    expect(storageUtility.set.mock.calls.length).toBe(1);
    expect(storageUtility.set.mock.calls[0][0]).toBe(
      "issuerConfig:https://arbitrary.url"
    );
  });
});
