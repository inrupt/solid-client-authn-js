import { IStorageUtility } from "../StorageUtility";

export const StorageUtilityGetResponse = "getResponse";
export const StorageUtilitySafeGetResponse = {
  someKey: "someValue"
};

export const StorageUtilityMock: jest.Mocked<IStorageUtility> = {
  get: jest.fn(async (key: string) => StorageUtilityGetResponse),
  set: jest.fn(async (key: string, value: string) => {
    /* do nothing */
  }),
  delete: jest.fn(async (key: string) => {
    /* do nothing */
  }),
  getForUser: jest.fn(
    async (userId: string, key: string) => StorageUtilityGetResponse
  ),
  setForUser: jest.fn(async (userId: string, key: string, value: string) => {
    /* do nothing */
  }),
  deleteForUser: jest.fn(async (userId: string, key: string) => {
    /* do nothing */
  }),
  deleteAllUserData: jest.fn(async (userId: string) => {
    /* do nothing */
  }),
  safeGet: jest.fn(
    async (
      key: string,
      options?: Partial<{
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        schema?: Record<string, any>;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        postProcess?: (retrievedObject: any) => any;
        userId?: string;
      }>
    ) => StorageUtilitySafeGetResponse
  )
};
