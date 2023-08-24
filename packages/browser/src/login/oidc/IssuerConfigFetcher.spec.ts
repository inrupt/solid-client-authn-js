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
import { mockStorageUtility } from "@inrupt/solid-client-authn-core";
import { Response as NodeResponse } from "@inrupt/universal-fetch";
import type * as UniversalFetch from "@inrupt/universal-fetch";
import IssuerConfigFetcher from "./IssuerConfigFetcher";

jest.mock("@inrupt/universal-fetch", () => {
  const fetchModule = jest.requireActual(
    "@inrupt/universal-fetch",
  ) as typeof UniversalFetch;
  return {
    ...fetchModule,
    fetch: jest.fn<(typeof UniversalFetch)["fetch"]>(),
  };
});

/**
 * Test for IssuerConfigFetcher
 */
describe("IssuerConfigFetcher", () => {
  const defaultMocks = {
    storageUtility: mockStorageUtility({}),
  };

  function getIssuerConfigFetcher(
    mocks: Partial<typeof defaultMocks> = defaultMocks,
  ): IssuerConfigFetcher {
    return new IssuerConfigFetcher(
      mocks.storageUtility ?? defaultMocks.storageUtility,
    );
  }

  it("should return a config based on the fetched config if none was stored in the storage", async () => {
    const configFetcher = getIssuerConfigFetcher({
      storageUtility: mockStorageUtility({}),
    });
    const { fetch: mockFetch } = jest.requireMock(
      "@inrupt/universal-fetch",
    ) as jest.Mocked<typeof UniversalFetch>;
    mockFetch.mockResolvedValueOnce(
      new NodeResponse(
        JSON.stringify({
          issuer: "https://example.com",
          // eslint-disable-next-line camelcase
          claim_types_supported: "oidc",
          bleepBloop: "Meep Moop",
          end_session_endpoint: "https://example.com/endSessionEndpoint",
        }),
      ),
    );
    const fetchedConfig = await configFetcher.fetchConfig(
      "https://arbitrary.url",
    );
    expect(fetchedConfig.issuer.startsWith("https:")).toBeTruthy();
    expect(fetchedConfig.issuer).toBe("https://example.com");
    expect((fetchedConfig as any).claim_types_supported).toBeUndefined();
    expect(fetchedConfig.claimTypesSupported).toBe("oidc");
    expect(fetchedConfig.endSessionEndpoint).toBe(
      "https://example.com/endSessionEndpoint",
    );
    expect((fetchedConfig as any).bleepBloop).toBeUndefined();
  });

  it("should throw an error if the fetched config could not be converted to JSON", async () => {
    const { fetch: mockFetch } = jest.requireMock(
      "@inrupt/universal-fetch",
    ) as jest.Mocked<typeof UniversalFetch>;
    mockFetch.mockResolvedValueOnce(new NodeResponse("Not JSON."));
    const configFetcher = new IssuerConfigFetcher(mockStorageUtility({}));

    await expect(configFetcher.fetchConfig("https://some.url")).rejects.toThrow(
      "[https://some.url] has an invalid configuration:",
    );
  });

  it("should return a config including the support for solid-oidc if present in the discovery profile", async () => {
    const { fetch: mockFetch } = jest.requireMock(
      "@inrupt/universal-fetch",
    ) as jest.Mocked<typeof UniversalFetch>;
    mockFetch.mockResolvedValueOnce(
      new NodeResponse(
        JSON.stringify({
          issuer: "https://example.com",
          // eslint-disable-next-line camelcase
          claim_types_supported: "oidc",
          scopes_supported: ["openid", "offline_access", "webid"],
        }),
      ),
    );
    const configFetcher = getIssuerConfigFetcher({
      storageUtility: mockStorageUtility({}),
    });
    const fetchedConfig = await configFetcher.fetchConfig(
      "https://arbitrary.url",
    );
    expect(fetchedConfig.scopesSupported).toContain("webid");
    expect(fetchedConfig.scopesSupported).toContain("openid");
    expect(fetchedConfig.scopesSupported).toContain("offline_access");
  });

  it("should return a default value for the supported scopes if not advertized by the OpenID provider", async () => {
    const { fetch: mockFetch } = jest.requireMock(
      "@inrupt/universal-fetch",
    ) as jest.Mocked<typeof UniversalFetch>;
    mockFetch.mockResolvedValueOnce(
      new NodeResponse(
        JSON.stringify({
          issuer: "https://example.com",
          // eslint-disable-next-line camelcase
          claim_types_supported: "oidc",
        }),
      ),
    );
    const configFetcher = getIssuerConfigFetcher({
      storageUtility: mockStorageUtility({}),
    });
    const fetchedConfig = await configFetcher.fetchConfig(
      "https://arbitrary.url",
    );
    expect(fetchedConfig.scopesSupported).toContain("openid");
  });

  it("should append the .well-known/openid-configuration path at the end of the issuer URL", async () => {
    // The response value is irrelevant to this test.
    const { fetch: mockFetch } = jest.requireMock(
      "@inrupt/universal-fetch",
    ) as jest.Mocked<typeof UniversalFetch>;
    mockFetch.mockImplementation(
      async () =>
        new NodeResponse(
          JSON.stringify({
            issuer: "https://example.com",
            // eslint-disable-next-line camelcase
            claim_types_supported: "oidc",
            scopes_supported: ["openid", "offline_access", "webid"],
          }),
        ),
    );
    const configFetcher = getIssuerConfigFetcher({
      storageUtility: mockStorageUtility({}),
    });
    // No trailing slash
    await configFetcher.fetchConfig("https://arbitrary.url");
    expect(mockFetch).toHaveBeenLastCalledWith(
      "https://arbitrary.url/.well-known/openid-configuration",
    );
    // A trailing slash
    await configFetcher.fetchConfig("https://arbitrary.url/");
    expect(mockFetch).toHaveBeenLastCalledWith(
      "https://arbitrary.url/.well-known/openid-configuration",
    );
    // A path without a trailing slash
    await configFetcher.fetchConfig("https://arbitrary.url/path");
    expect(mockFetch).toHaveBeenLastCalledWith(
      "https://arbitrary.url/path/.well-known/openid-configuration",
    );
    // A path with a trailing slash
    await configFetcher.fetchConfig("https://arbitrary.url/path/");
    expect(mockFetch).toHaveBeenLastCalledWith(
      "https://arbitrary.url/path/.well-known/openid-configuration",
    );
  });
});
