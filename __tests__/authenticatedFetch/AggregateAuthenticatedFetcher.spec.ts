import "reflect-metadata";
import AggregateAuthenticatedFetcher from "../../src/authenticatedFetch/AggregateAuthenticatedFetcher";
import IAuthenticatedFetcher from "../../src/authenticatedFetch/IAuthenticatedFetcher";
import AggregateHandler from "../../src/util/handlerPattern/AggregateHandler";

jest.mock("../../src/util/handlerPattern/AggregateHandler");

describe("AggregateAuthenticatedFetcher", () => {
  it("should pass injected fetchers to its superclass", () => {
    new AggregateAuthenticatedFetcher(([
      "Some fetcher"
    ] as unknown) as IAuthenticatedFetcher[]);

    expect((AggregateHandler as jest.Mock).mock.calls).toEqual([
      [["Some fetcher"]]
    ]);
  });
});
