import { IStorageRetriever } from "../../src/util/StorageRetriever";
import IStorage from "../../src/authenticator/IStorage";

export default function StorageMocks(response?: string | null) {
  const StorageMockGetResponse: string = response || '{ "cool": "string" }';

  const StorageMockGetFunction = jest.fn(async (key: string) => {
    return StorageMockGetResponse;
  });

  const StorageMockSetFunction = jest.fn(async (key: string, value: string) => {
    /* void */
  });
  const StorageMockDeleteFunction = jest.fn(async (key: string) => {
    /* void */
  });

  const StorageMock = jest.fn(() => ({
    get: StorageMockGetFunction,
    set: StorageMockSetFunction,
    delete: StorageMockDeleteFunction
  }));

  return {
    StorageMockGetResponse,
    StorageMockGetFunction,
    StorageMockSetFunction,
    StorageMockDeleteFunction,
    StorageMock
  };
}
