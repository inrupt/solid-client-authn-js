import IStorage from "../IStorage";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
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

  const StorageMock: jest.Mocked<IStorage> = {
    get: StorageMockGetFunction,
    set: StorageMockSetFunction,
    delete: StorageMockDeleteFunction
  };

  return {
    StorageMockGetResponse,
    StorageMockGetFunction,
    StorageMockSetFunction,
    StorageMockDeleteFunction,
    StorageMock
  };
}
