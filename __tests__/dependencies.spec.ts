import getAuthFetcherWithDependencies from "../src/dependencies";
import AuthFetcher from "../src/AuthFetcher";
import { StorageMock } from "../src/localStorage/__mocks__/Storage";

describe("dependencies", () => {
  it("performs dependency injection", () => {
    const authFetcher = getAuthFetcherWithDependencies({});
    expect(authFetcher).toBeInstanceOf(AuthFetcher);
  });

  it("performs dependency injection with a given input", () => {
    const authFetcher = getAuthFetcherWithDependencies({
      storage: StorageMock
    });
    expect(authFetcher).toBeInstanceOf(AuthFetcher);
  });
});
