import UuidGenerator from "../../src/util/UuidGenerator";

jest.mock("uuid");

describe("UuidGenerator", () => {
  it("should simply wrap the `uuid` module", () => {
    const uuidMock: { v4: jest.Mock } = jest.requireMock("uuid");
    uuidMock.v4.mockReturnValueOnce("some uuid");

    const generator = new UuidGenerator();
    expect(generator.v4()).toBe("some uuid");
  });
});
