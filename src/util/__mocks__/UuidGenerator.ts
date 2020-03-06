import { IUuidGenerator } from "../UuidGenerator";

export const UuidGeneratorMockResponse = "fee3fa53-a6a9-475c-a0da-b1343a4fff76";

export const UuidGeneratorMock: jest.Mocked<IUuidGenerator> = {
  v4: jest.fn(() => UuidGeneratorMockResponse)
};
