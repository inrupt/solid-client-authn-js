import { IUUIDGenerator } from "../../src/util/UUIDGenerator";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default function UUIDGeneratorMocks() {
  const UUIDGeneratorMockResponse = "fee3fa53-a6a9-475c-a0da-b1343a4fff76";

  const UUIDGeneratorMockFunction = jest.fn(() => {
    return UUIDGeneratorMockResponse;
  });

  const UUIDGeneratorMock: () => IUUIDGenerator = jest.fn<
    IUUIDGenerator,
    unknown[]
  >(() => ({
    v4: UUIDGeneratorMockFunction
  }));

  return {
    UUIDGeneratorMockFunction,
    UUIDGeneratorMockResponse,
    UUIDGeneratorMock
  };
}
