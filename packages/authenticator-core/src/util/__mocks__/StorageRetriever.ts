import { IStorageRetriever } from "../StorageRetriever";

type PromiseValue<T> = T extends Promise<infer U> ? U : T;
export const StorageRetrieverMockResponse: PromiseValue<ReturnType<
  IStorageRetriever["retrieve"]
>> = {
  someKey: "someString"
};

export const StorageRetrieverMock: jest.Mocked<IStorageRetriever> = {
  retrieve: jest.fn(async _key => StorageRetrieverMockResponse)
};
