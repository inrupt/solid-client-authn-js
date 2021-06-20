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

import { jest, it, describe, expect } from "@jest/globals";
import { mockStorageUtility } from "@inrupt/solid-client-authn-core";
import { Response as NodeResponse } from "node-fetch";
import IssuerConfigFetcher from "../../../src/login/oidc/IssuerConfigFetcher";

/**
 * Test for IssuerConfigFetcher
 */
describe("IssuerConfigFetcher", () => {
  const defaultMocks = {
    storageUtility: mockStorageUtility({}),
  };

  function getIssuerConfigFetcher(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): IssuerConfigFetcher {
    return new IssuerConfigFetcher(
      mocks.storageUtility ?? defaultMocks.storageUtility
    );
  }

  it("should return a config based on the fetched config if none was stored in the storage", async () => {
    const fetchResponse = new NodeResponse(
      JSON.stringify({
        issuer: "https://example.com",
        // eslint-disable-next-line camelcase
        claim_types_supported: "oidc",
        bleepBloop: "Meep Moop",
      })
    ) as unknown as Response;
    const configFetcher = getIssuerConfigFetcher({
      storageUtility: mockStorageUtility({}),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockFetch = (jest.fn() as any).mockResolvedValueOnce(fetchResponse);
    window.fetch = mockFetch as typeof window.fetch;
    const fetchedConfig = await configFetcher.fetchConfig(
      "https://arbitrary.url"
    );
    expect(fetchedConfig.issuer.startsWith("https:")).toBeTruthy();
    expect(fetchedConfig.issuer).toBe("https://example.com");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((fetchedConfig as any).claim_types_supported).toBeUndefined();
    expect(fetchedConfig.claimTypesSupported).toBe("oidc");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((fetchedConfig as any).bleepBloop).toBeUndefined();
  });

  it("should throw an error if the fetched config could not be converted to JSON", async () => {
    const mockFetch = (): Promise<Response> =>
      Promise.resolve({
        json: () => {
          throw new Error("Some error");
        },
      } as unknown as Response);
    window.fetch = mockFetch;
    const configFetcher = new IssuerConfigFetcher(mockStorageUtility({}));

    await expect(configFetcher.fetchConfig("https://some.url")).rejects.toThrow(
      "[https://some.url] has an invalid configuration: Some error"
    );
  });

  it("should return a config including the support for solid-oidc if present in the discovery profile", async () => {
    const fetchResponse = new NodeResponse(
      JSON.stringify({
        issuer: "https://example.com",
        // eslint-disable-next-line camelcase
        claim_types_supported: "oidc",
        solid_oidc_supported: "https://solidproject.org/TR/solid-oidc",
      })
    ) as unknown as Response;
    const configFetcher = getIssuerConfigFetcher({
      storageUtility: mockStorageUtility({}),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockFetch = (jest.fn() as any).mockResolvedValueOnce(fetchResponse);
    window.fetch = mockFetch as typeof window.fetch;
    const fetchedConfig = await configFetcher.fetchConfig(
      "https://arbitrary.url"
    );
    expect(fetchedConfig.solidOidcSupported).toBe(
      "https://solidproject.org/TR/solid-oidc"
    );
  });
});
