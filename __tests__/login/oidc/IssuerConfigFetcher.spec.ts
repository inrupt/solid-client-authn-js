import "reflect-metadata";
import URL from "url-parse";
import { Response } from "cross-fetch";
import {
  FetcherMock,
  FetcherMockResponse
} from "../../../src/util/__mocks__/Fetcher";
import { StorageRetrieverMock } from "../../../src/util/__mocks__/StorageRetriever";
import { StorageMock } from "../../../src/authenticator/__mocks__/Storage";
import IssuerConfigFetcher from "../../../src/login/oidc/IssuerConfigFetcher";
import { IFetcher } from "../../../src/util/Fetcher";

/**
 * Test for IssuerConfigFetcher
 */
describe("IssuerConfigFetcher", () => {
  const defaultMocks = {
    fetchResponse: FetcherMockResponse,
    storageRetriever: StorageRetrieverMock,
    storage: StorageMock
  };
  function getIssuerConfigFetcher(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): IssuerConfigFetcher {
    FetcherMock.fetch.mockReturnValue(
      Promise.resolve(mocks.fetchResponse ?? defaultMocks.fetchResponse)
    );
    return new IssuerConfigFetcher(
      FetcherMock,
      mocks.storageRetriever ?? defaultMocks.storageRetriever,
      mocks.storage ?? defaultMocks.storage
    );
  }

  it("should return the config stored in the storage", async () => {
    const storageMock = defaultMocks.storageRetriever;
    storageMock.retrieve.mockReturnValueOnce(
      Promise.resolve({ some: "config" })
    );
    const configFetcher = getIssuerConfigFetcher({
      storageRetriever: storageMock
    });

    const fetchedConfig = await configFetcher.fetchConfig(
      new URL("https://arbitrary.url")
    );

    expect(fetchedConfig).toEqual({ some: "config" });
  });

  it("should return a config based on the fetched config if none was stored in the storage", async () => {
    const storageMock = defaultMocks.storageRetriever;
    storageMock.retrieve.mockReturnValueOnce(Promise.resolve(null));
    const fetchResponse = new Response(
      JSON.stringify({
        issuer: "https://example.com",
        // eslint-disable-next-line @typescript-eslint/camelcase
        claim_types_supported: "oidc",
        bleepBloop: "Meep Moop"
      })
    );
    const configFetcher = getIssuerConfigFetcher({
      storageRetriever: storageMock,
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
    const storageMock = defaultMocks.storageRetriever;
    storageMock.retrieve.mockReturnValueOnce(Promise.resolve(null));
    const fetchResponse = new Response(
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
    );
    const configFetcher = getIssuerConfigFetcher({
      storageRetriever: storageMock,
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
    const storageMock = defaultMocks.storageRetriever;
    storageMock.retrieve.mockReturnValueOnce(Promise.resolve(null));
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
      storageMock,
      defaultMocks.storage
    );

    await expect(
      configFetcher.fetchConfig(new URL("https://some.url"))
    ).rejects.toThrowError(
      "https://some.url has an invalid configuration: Some error"
    );
  });

  it("should store the config under a key specific to the config source", async () => {
    const storage = defaultMocks.storage;
    const configFetcher = getIssuerConfigFetcher({ storage: storage });

    await configFetcher.fetchConfig(new URL("https://arbitrary.url"));

    expect(storage.set.mock.calls.length).toBe(1);
    expect(storage.set.mock.calls[0][0]).toBe(
      "issuerConfig:https://arbitrary.url"
    );
  });
});
