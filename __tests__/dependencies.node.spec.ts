/**
 * @jest-environment node
 */
import getAuthFetcherWithDependencies from "../src/dependencies";
import AuthFetcher from "../src/AuthFetcher";

describe("dependencies.node", () => {
  it("performs dependency injection in a node environment", () => {
    const authFetcher = getAuthFetcherWithDependencies({});
    expect(authFetcher).toBeInstanceOf(AuthFetcher);
  });
});
