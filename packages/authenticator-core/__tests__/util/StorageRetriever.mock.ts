import { IStorageRetriever } from "../../src/util/StorageRetriever";

export default function StorageRetrieverMocks(result?: any) {
  let StorageRetrieverMockResponse: Record<string, any>;
  if (!result && result !== null) {
    StorageRetrieverMockResponse = {
      someKey: "someString"
    };
  } else {
    StorageRetrieverMockResponse = result;
  }

  const StorageRetrieverMockFunction = jest.fn(async (key: string) => {
    return StorageRetrieverMockResponse;
  });

  const StorageRetrieverMock = jest.fn(() => ({
    retrieve: StorageRetrieverMockFunction
  }));

  return {
    StorageRetrieverMockResponse,
    StorageRetrieverMockFunction,
    StorageRetrieverMock
  };
}
