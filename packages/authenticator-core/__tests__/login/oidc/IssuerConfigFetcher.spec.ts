import "reflect-metadata";
import URL from "url-parse";
import FetcherMocks from "../../util/Fetcher.mock";
import StorageRetrieverMocks from "../../util/StorageRetriever.mock";
import StorageMocks from "../../authenticator/Storage.mock";
import IssuerConfigFetcher from "../../../src/login/oidc/IssuerConfigFetcher";

/**
 * Test for IssuerConfigFetcher
 */
describe("IssuerConfigFetcher", () => {
  const defaultMocks = {
    fetchResponse: {} as object,
    storageRetriever: StorageRetrieverMocks().StorageRetrieverMock(),
    storage: StorageMocks().StorageMock()
  };
  function getMockConfigFetcher(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ) {
    const fetcherMock = FetcherMocks().FetcherMock();
    fetcherMock.fetch.mockReturnValue(
      Promise.resolve({
        json: jest
          .fn()
          .mockReturnValue(
            Promise.resolve(mocks.fetchResponse ?? defaultMocks.fetchResponse)
          )
      })
    );
    return new IssuerConfigFetcher(
      fetcherMock as any,
      mocks.storageRetriever ?? defaultMocks.storageRetriever,
      mocks.storage ?? defaultMocks.storage
    );
  }

  it("should return the config stored in the storage", async () => {
    const storageMock = defaultMocks.storageRetriever;
    storageMock.retrieve.mockReturnValueOnce({ some: "config" } as any);
    const configFetcher = getMockConfigFetcher({
      storageRetriever: storageMock
    });

    const fetchedConfig = await configFetcher.fetchConfig(
      new URL("https://arbitrary.url")
    );

    expect(fetchedConfig).toEqual({ some: "config" });
  });

  it("should return the fetched config if none was stored in the storage", async () => {
    const storageMock = defaultMocks.storageRetriever;
    // @ts-ignore: Ignore because this mock function should be able to return null
    storageMock.retrieve.mockReturnValueOnce(null);
    const fetchResponse = { some: "config" };
    const configFetcher = getMockConfigFetcher({
      storageRetriever: storageMock,
      fetchResponse: fetchResponse
    });

    const fetchedConfig = await configFetcher.fetchConfig(
      new URL("https://arbitrary.url")
    );

    expect(fetchedConfig.some).toBe("config");
  });

  it("should wrap URLs in url-parse's URL object", async () => {
    const storageMock = defaultMocks.storageRetriever;
    // @ts-ignore: Ignore because this mock function should be able to return null
    storageMock.retrieve.mockReturnValueOnce(null);
    const fetchResponse = {
      issuer: "https://issuer.url",
      authorization_endpoint: "https://authorization_endpoint.url",
      token_endpoint: "https://token_endpoint.url",
      userinfo_endpoint: "https://userinfo_endpoint.url",
      jwks_uri: "https://jwks_uri.url",
      registration_endpoint: "https://registration_endpoint.url"
    };
    const configFetcher = getMockConfigFetcher({
      storageRetriever: storageMock,
      fetchResponse: fetchResponse
    });

    const fetchedConfig = await configFetcher.fetchConfig(
      new URL("https://arbitrary.url")
    );

    expect(fetchedConfig.issuer).toEqual(new URL("https://issuer.url"));
    expect(fetchedConfig.authorization_endpoint).toEqual(
      new URL("https://authorization_endpoint.url")
    );
    expect(fetchedConfig.token_endpoint).toEqual(
      new URL("https://token_endpoint.url")
    );
    expect(fetchedConfig.userinfo_endpoint).toEqual(
      new URL("https://userinfo_endpoint.url")
    );
    expect(fetchedConfig.jwks_uri).toEqual(new URL("https://jwks_uri.url"));
    expect(fetchedConfig.registration_endpoint).toEqual(
      new URL("https://registration_endpoint.url")
    );
  });

  it("should throw an error if the fetched config could not be converted to JSON", async () => {
    const storageMock = defaultMocks.storageRetriever;
    // @ts-ignore: Ignore because this mock function should be able to return null
    storageMock.retrieve.mockReturnValueOnce(null);
    const mockFetcher = {
      fetch: () =>
        Promise.resolve({
          json: () => {
            throw new Error("Some error");
          }
        })
    };
    const configFetcher = new IssuerConfigFetcher(
      mockFetcher as any,
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
    const configFetcher = getMockConfigFetcher({ storage: storage });

    await configFetcher.fetchConfig(new URL("https://arbitrary.url"));

    expect(storage.set.mock.calls.length).toBe(1);
    expect(storage.set.mock.calls[0][0]).toBe(
      "issuerConfig:https://arbitrary.url"
    );
  });
});
