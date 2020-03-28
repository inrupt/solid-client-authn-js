import IStorage from "../IStorage";

export const StorageGetResponse = "GetResponse";

export const StorageMock: jest.Mocked<IStorage> = {
  get: jest.fn(async (key: string) => StorageGetResponse),
  set: jest.fn(async (key: string, value: string) => {
    /* do nothing */
  }),
  delete: jest.fn(async (key: string) => {
    /* do nothing */
  })
};
