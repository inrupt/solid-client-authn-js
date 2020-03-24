jest.mock("../../../src/util/handlerPattern/AggregateHandler");

// Required by TSyringe:
import "reflect-metadata";
import AggregateOidcHandler from "../../../src/login/oidc/AggregateOidcHandler";
import IOidcHandler from "../../../src/login/oidc/IOidcHandler";
import AggregateHandler from "../../../src/util/handlerPattern/AggregateHandler";

describe("AggregateOidcHandler", () => {
  it("should pass injected handlers to its superclass", () => {
    new AggregateOidcHandler((["Some handler"] as unknown) as IOidcHandler[]);

    expect((AggregateHandler as jest.Mock).mock.calls).toEqual([
      [["Some handler"]]
    ]);
  });
});
