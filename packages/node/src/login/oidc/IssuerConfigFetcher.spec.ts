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
import { mockStorageUtility } from "@inrupt/solid-client-authn-core";
import IssuerConfigFetcher from "./IssuerConfigFetcher";
import {
  mockDefaultIssuerMetadata,
  mockIssuerMetadata,
} from "./__mocks__/IssuerConfigFetcher";

jest.mock("openid-client");

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
    const { Issuer } = jest.requireMock("openid-client");
    const mockedIssuerConfig = mockDefaultIssuerMetadata();
    Issuer.discover = jest.fn().mockResolvedValueOnce({
      metadata: mockedIssuerConfig,
    });

    const configFetcher = getIssuerConfigFetcher({
      storageUtility: mockStorageUtility({}),
    });

    const fetchedConfig = await configFetcher.fetchConfig("https://my.idp/");
    expect(fetchedConfig.issuer).toBe(mockedIssuerConfig.issuer);
    expect(fetchedConfig.authorizationEndpoint).toBe(
      mockedIssuerConfig.authorization_endpoint
    );
    expect(fetchedConfig.claimsSupported).toBe(
      mockedIssuerConfig.claims_supported
    );
    expect(fetchedConfig.issuer).toBe(mockedIssuerConfig.issuer);
    expect(fetchedConfig.jwksUri).toBe(mockedIssuerConfig.jwks_uri);
    expect(fetchedConfig.tokenEndpoint).toBe(mockedIssuerConfig.token_endpoint);
    expect(fetchedConfig.subjectTypesSupported).toBe(
      mockedIssuerConfig.subject_types_supported
    );
  });

  it("throws an error if authorization_endpoint is missing", async () => {
    const { Issuer } = jest.requireMock("openid-client");
    const mockedIssuerConfig = mockIssuerMetadata({
      authorization_endpoint: undefined,
    });
    Issuer.discover = jest.fn().mockResolvedValueOnce({
      metadata: mockedIssuerConfig,
    });

    const configFetcher = getIssuerConfigFetcher({
      storageUtility: mockStorageUtility({}),
    });

    await expect(configFetcher.fetchConfig("https://my.idp/")).rejects.toThrow(
      "Issuer metadata is missing an authorization endpoint"
    );
  });

  it("throws an error if token_endpoint is missing", async () => {
    const { Issuer } = jest.requireMock("openid-client");
    const mockedIssuerConfig = mockIssuerMetadata({
      token_endpoint: undefined,
    });
    Issuer.discover = jest.fn().mockResolvedValueOnce({
      metadata: mockedIssuerConfig,
    });

    const configFetcher = getIssuerConfigFetcher({
      storageUtility: mockStorageUtility({}),
    });

    await expect(configFetcher.fetchConfig("https://my.idp/")).rejects.toThrow(
      "Issuer metadata is missing an token endpoint"
    );
  });

  it("throws an error if jwks_uri is missing", async () => {
    const { Issuer } = jest.requireMock("openid-client");
    const mockedIssuerConfig = mockIssuerMetadata({
      jwks_uri: undefined,
    });
    Issuer.discover = jest.fn().mockResolvedValueOnce({
      metadata: mockedIssuerConfig,
    });

    const configFetcher = getIssuerConfigFetcher({
      storageUtility: mockStorageUtility({}),
    });

    await expect(configFetcher.fetchConfig("https://my.idp/")).rejects.toThrow(
      "Issuer metadata is missing a keyset URI"
    );
  });

  it("throws an error if claims_supported is missing", async () => {
    const { Issuer } = jest.requireMock("openid-client");
    const mockedIssuerConfig = mockIssuerMetadata({
      claims_supported: undefined,
    });
    Issuer.discover = jest.fn().mockResolvedValueOnce({
      metadata: mockedIssuerConfig,
    });

    const configFetcher = getIssuerConfigFetcher({
      storageUtility: mockStorageUtility({}),
    });

    await expect(configFetcher.fetchConfig("https://my.idp/")).rejects.toThrow(
      "Issuer metadata is missing supported claims:"
    );
  });

  it("throws an error if subject_types_supported is missing", async () => {
    const { Issuer } = jest.requireMock("openid-client");
    const mockedIssuerConfig = mockIssuerMetadata({
      subject_types_supported: undefined,
    });
    Issuer.discover = jest.fn().mockResolvedValueOnce({
      metadata: mockedIssuerConfig,
    });

    const configFetcher = getIssuerConfigFetcher({
      storageUtility: mockStorageUtility({}),
    });

    await expect(configFetcher.fetchConfig("https://my.idp/")).rejects.toThrow(
      "Issuer metadata is missing supported subject types:"
    );
  });

  it("should return a config including the support for solid-oidc if present in the discovery profile", async () => {
    const { Issuer } = jest.requireMock("openid-client");
    const mockedIssuerConfig = mockIssuerMetadata({
      solid_oidc_supported: "https://solidproject.org/TR/solid-oidc",
    });
    Issuer.discover = jest.fn().mockResolvedValueOnce({
      metadata: mockedIssuerConfig,
    });

    const configFetcher = getIssuerConfigFetcher({
      storageUtility: mockStorageUtility({}),
    });
    const fetchedConfig = await configFetcher.fetchConfig("https://my.idp/");
    expect(fetchedConfig.solidOidcSupported).toBe(
      "https://solidproject.org/TR/solid-oidc"
    );
  });
});
