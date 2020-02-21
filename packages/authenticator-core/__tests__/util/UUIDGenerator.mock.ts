import { IUuidGenerator } from "../../src/util/UuidGenerator";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default function UuidGeneratorMocks() {
  const UuidGeneratorMockResponse = "fee3fa53-a6a9-475c-a0da-b1343a4fff76";

  const UuidGeneratorMockFunction = jest.fn(() => {
    return UuidGeneratorMockResponse;
  });

  const UuidGeneratorMock: () => IUuidGenerator = jest.fn<
    IUuidGenerator,
    unknown[]
  >(() => ({
    v4: UuidGeneratorMockFunction
  }));

  return {
    UuidGeneratorMockFunction,
    UuidGeneratorMockResponse,
    UuidGeneratorMock
  };
}
