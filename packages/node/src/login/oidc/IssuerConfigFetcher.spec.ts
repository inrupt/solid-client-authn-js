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

import { mockStorageUtility } from "@inrupt/solid-client-authn-core";
import {
  jest,
  it,
  describe,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import type { ServerMetadata } from "openid-client";
import IssuerConfigFetcher, {
  configFromIssuerMetadata,
  configToIssuerMetadata,
} from "./IssuerConfigFetcher";
import {
  mockDefaultIssuerMetadata,
  mockIssuerMetadata,
} from "./__mocks__/IssuerConfigFetcher";

// Camelcase identifiers are required in the OIDC specification.
/* eslint-disable camelcase*/

const mockJsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/**
 * Test for IssuerConfigFetcher
 */
describe("IssuerConfigFetcher", () => {
  let mockedFetch: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    mockedFetch = jest.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    // Discard any network response mocked but not consumed by a test.
    mockedFetch.mockRestore();
  });

  const mockDiscovery = (metadata: Partial<ServerMetadata>) =>
    mockedFetch.mockResolvedValueOnce(mockJsonResponse(metadata));

  const getRequestedUrl = (): string =>
    (mockedFetch.mock.calls[0][0] as URL).href;

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
    const mockedIssuerConfig = mockDefaultIssuerMetadata();
    mockDiscovery(mockedIssuerConfig);

    const configFetcher = getIssuerConfigFetcher({
      storageUtility: mockStorageUtility({}),
    });

    const fetchedConfig = await configFetcher.fetchConfig("https://my.idp/");
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(getRequestedUrl()).toBe(
      "https://my.idp/.well-known/openid-configuration",
    );
    expect(mockedFetch.mock.calls[0][1]).toEqual({
      headers: { Accept: "application/json" },
    });
    expect(fetchedConfig.issuer).toBe(mockedIssuerConfig.issuer);
    expect(fetchedConfig.authorizationEndpoint).toBe(
      mockedIssuerConfig.authorization_endpoint,
    );
    expect(fetchedConfig.claimsSupported).toEqual(
      mockedIssuerConfig.claims_supported,
    );
    expect(fetchedConfig.jwksUri).toBe(mockedIssuerConfig.jwks_uri);
    expect(fetchedConfig.tokenEndpoint).toBe(mockedIssuerConfig.token_endpoint);
    expect(fetchedConfig.registrationEndpoint).toBe(
      mockedIssuerConfig.registration_endpoint,
    );
    expect(fetchedConfig.subjectTypesSupported).toEqual(
      mockedIssuerConfig.subject_types_supported,
    );
    expect(fetchedConfig.endSessionEndpoint).toBe(
      mockedIssuerConfig.end_session_endpoint,
    );
  });

  it("stores the fetched config in storage", async () => {
    mockDiscovery(mockDefaultIssuerMetadata());
    const storageUtility = mockStorageUtility({});
    const configFetcher = getIssuerConfigFetcher({ storageUtility });

    const fetchedConfig = await configFetcher.fetchConfig("https://my.idp/");

    await expect(
      storageUtility.get(
        IssuerConfigFetcher.getLocalStorageKey("https://my.idp/"),
      ),
    ).resolves.toBe(JSON.stringify(fetchedConfig));
  });

  it("appends a trailing slash to the issuer before resolving the discovery document", async () => {
    mockDiscovery(mockIssuerMetadata({ issuer: "https://my.idp/some/path" }));
    const configFetcher = getIssuerConfigFetcher({
      storageUtility: mockStorageUtility({}),
    });

    const fetchedConfig = await configFetcher.fetchConfig(
      "https://my.idp/some/path",
    );
    expect(getRequestedUrl()).toBe(
      "https://my.idp/some/path/.well-known/openid-configuration",
    );
    expect(fetchedConfig.issuer).toBe("https://my.idp/some/path");
  });

  it("does not add a trailing slash to an issuer which already has one", async () => {
    mockDiscovery(mockIssuerMetadata({ issuer: "https://my.idp/some/path/" }));
    const configFetcher = getIssuerConfigFetcher({
      storageUtility: mockStorageUtility({}),
    });

    await configFetcher.fetchConfig("https://my.idp/some/path/");
    expect(getRequestedUrl()).toBe(
      "https://my.idp/some/path/.well-known/openid-configuration",
    );
  });

  it("tolerates a trailing slash in the discovered issuer which isn't in the requested issuer", async () => {
    mockDiscovery(mockIssuerMetadata({ issuer: "https://my.idp/" }));
    const configFetcher = getIssuerConfigFetcher({
      storageUtility: mockStorageUtility({}),
    });

    const fetchedConfig = await configFetcher.fetchConfig("https://my.idp");
    expect(getRequestedUrl()).toBe(
      "https://my.idp/.well-known/openid-configuration",
    );
    expect(fetchedConfig.issuer).toBe("https://my.idp/");
  });

  it("tolerates a trailing slash in the requested issuer which isn't in the discovered issuer", async () => {
    mockDiscovery(mockIssuerMetadata({ issuer: "https://my.idp" }));
    const configFetcher = getIssuerConfigFetcher({
      storageUtility: mockStorageUtility({}),
    });

    const fetchedConfig = await configFetcher.fetchConfig("https://my.idp/");
    expect(fetchedConfig.issuer).toBe("https://my.idp");
  });

  it("throws if the discovered issuer does not match the requested issuer", async () => {
    mockDiscovery(mockIssuerMetadata({ issuer: "https://other.idp/" }));
    const configFetcher = getIssuerConfigFetcher({
      storageUtility: mockStorageUtility({}),
    });

    await expect(configFetcher.fetchConfig("https://my.idp/")).rejects.toThrow(
      "The issuer identifier [https://other.idp/] in the configuration fetched from [https://my.idp/.well-known/openid-configuration] does not match the expected issuer [https://my.idp/].",
    );
  });

  it("throws if the discovered configuration has no issuer", async () => {
    mockDiscovery(mockIssuerMetadata({ issuer: undefined }));
    const configFetcher = getIssuerConfigFetcher({
      storageUtility: mockStorageUtility({}),
    });

    await expect(configFetcher.fetchConfig("https://my.idp/")).rejects.toThrow(
      "The issuer identifier [undefined] in the configuration fetched from [https://my.idp/.well-known/openid-configuration] does not match the expected issuer [https://my.idp/].",
    );
  });

  it("throws if the issuer does not use HTTPS and isn't a loopback host", async () => {
    const configFetcher = getIssuerConfigFetcher({
      storageUtility: mockStorageUtility({}),
    });

    await expect(configFetcher.fetchConfig("http://my.idp/")).rejects.toThrow(
      "The issuer [http://my.idp/] must use HTTPS. Plain HTTP is only supported for loopback hosts.",
    );
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("throws if the issuer uses a protocol other than HTTP(S)", async () => {
    const configFetcher = getIssuerConfigFetcher({
      storageUtility: mockStorageUtility({}),
    });

    await expect(configFetcher.fetchConfig("ftp://localhost/")).rejects.toThrow(
      "must use HTTPS",
    );
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it.each([
    ["http://localhost:3000/"],
    ["http://127.0.0.1:3000/"],
    ["http://[::1]:3000/"],
    ["http://idp.localhost/"],
  ])("accepts the plain HTTP loopback issuer %s", async (issuer) => {
    mockDiscovery(mockIssuerMetadata({ issuer }));
    const configFetcher = getIssuerConfigFetcher({
      storageUtility: mockStorageUtility({}),
    });

    const fetchedConfig = await configFetcher.fetchConfig(issuer);
    expect(getRequestedUrl()).toBe(`${issuer}.well-known/openid-configuration`);
    expect(fetchedConfig.issuer).toBe(issuer);
  });

  it("throws if the issuer configuration cannot be fetched", async () => {
    mockedFetch.mockResolvedValueOnce(
      new Response("Not found", { status: 404, statusText: "Not Found" }),
    );
    const configFetcher = getIssuerConfigFetcher({
      storageUtility: mockStorageUtility({}),
    });

    await expect(configFetcher.fetchConfig("https://my.idp/")).rejects.toThrow(
      "Fetching the configuration of issuer [https://my.idp/] at [https://my.idp/.well-known/openid-configuration] failed: 404 Not Found",
    );
  });

  it("throws if the issuer configuration is not valid JSON", async () => {
    mockedFetch.mockResolvedValueOnce(
      new Response("<html>Not JSON</html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }),
    );
    const configFetcher = getIssuerConfigFetcher({
      storageUtility: mockStorageUtility({}),
    });

    await expect(configFetcher.fetchConfig("https://my.idp/")).rejects.toThrow(
      "The configuration of issuer [https://my.idp/] at [https://my.idp/.well-known/openid-configuration] is not valid JSON: SyntaxError",
    );
  });

  it("throws an error if authorization_endpoint is missing", async () => {
    mockDiscovery(
      mockIssuerMetadata({
        authorization_endpoint: undefined,
      }),
    );

    const configFetcher = getIssuerConfigFetcher({
      storageUtility: mockStorageUtility({}),
    });

    await expect(configFetcher.fetchConfig("https://my.idp/")).rejects.toThrow(
      "Issuer metadata is missing an authorization endpoint",
    );
  });

  it("throws an error if token_endpoint is missing", async () => {
    mockDiscovery(
      mockIssuerMetadata({
        token_endpoint: undefined,
      }),
    );

    const configFetcher = getIssuerConfigFetcher({
      storageUtility: mockStorageUtility({}),
    });

    await expect(configFetcher.fetchConfig("https://my.idp/")).rejects.toThrow(
      "Issuer metadata is missing an token endpoint",
    );
  });

  it("throws an error if jwks_uri is missing", async () => {
    mockDiscovery(
      mockIssuerMetadata({
        jwks_uri: undefined,
      }),
    );

    const configFetcher = getIssuerConfigFetcher({
      storageUtility: mockStorageUtility({}),
    });

    await expect(configFetcher.fetchConfig("https://my.idp/")).rejects.toThrow(
      "Issuer metadata is missing a keyset URI",
    );
  });

  it("throws an error if claims_supported is missing", async () => {
    mockDiscovery(
      mockIssuerMetadata({
        claims_supported: undefined,
      }),
    );

    const configFetcher = getIssuerConfigFetcher({
      storageUtility: mockStorageUtility({}),
    });

    await expect(configFetcher.fetchConfig("https://my.idp/")).rejects.toThrow(
      "Issuer metadata is missing supported claims:",
    );
  });

  it("throws an error if subject_types_supported is missing", async () => {
    mockDiscovery(
      mockIssuerMetadata({
        subject_types_supported: undefined,
      }),
    );

    const configFetcher = getIssuerConfigFetcher({
      storageUtility: mockStorageUtility({}),
    });

    await expect(configFetcher.fetchConfig("https://my.idp/")).rejects.toThrow(
      "Issuer metadata is missing supported subject types:",
    );
  });

  it("defaults scopes_supported to [openid] if omitted", async () => {
    mockDiscovery(
      mockIssuerMetadata({
        scopes_supported: undefined,
      }),
    );

    const configFetcher = getIssuerConfigFetcher({
      storageUtility: mockStorageUtility({}),
    });
    const fetchedConfig = await configFetcher.fetchConfig("https://my.idp/");
    expect(fetchedConfig.scopesSupported).toContain("openid");
    expect(fetchedConfig.scopesSupported).toHaveLength(1);
  });

  it("should return a config including the support for solid-oidc if present in the discovery profile", async () => {
    mockDiscovery(
      mockIssuerMetadata({
        scopes_supported: ["webid"],
      }),
    );

    const configFetcher = getIssuerConfigFetcher({
      storageUtility: mockStorageUtility({}),
    });
    const fetchedConfig = await configFetcher.fetchConfig("https://my.idp/");
    expect(fetchedConfig.scopesSupported).toContain("webid");
  });

  describe("configToIssuerMetadata", () => {
    it("converts an issuer config back into the equivalent server metadata", () => {
      const metadata = mockIssuerMetadata({
        scopes_supported: ["openid", "webid"],
        userinfo_endpoint: "https://my.idp/userinfo",
        response_types_supported: ["code"],
        token_endpoint_auth_methods_supported: ["client_secret_basic"],
      });
      expect(
        configToIssuerMetadata(configFromIssuerMetadata(metadata)),
      ).toMatchObject(metadata);
    });
  });
});
