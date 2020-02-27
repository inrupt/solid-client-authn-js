import IStorage from "../IStorage";

export const StorageMockGetResponse: string = '{ "cool": "string" }';

export const StorageMock: jest.Mocked<IStorage> = {
  get: jest.fn(async _key => StorageMockGetResponse),
  set: jest.fn(async (_key, _value) => undefined),
  delete: jest.fn(async _key => undefined)
};
