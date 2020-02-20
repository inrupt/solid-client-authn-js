// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default function StorageRetrieverMocks(result?: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
