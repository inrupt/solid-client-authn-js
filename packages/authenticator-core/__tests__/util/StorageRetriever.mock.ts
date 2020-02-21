// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-explicit-any
export default function StorageRetrieverMocks(result?: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let StorageRetrieverMockResponse: Record<string, any>;
  if (!result && result !== null) {
    StorageRetrieverMockResponse = {
      someKey: "someString"
    };
  } else {
    StorageRetrieverMockResponse = result;
  }

  const StorageRetrieverMockFunction = jest.fn(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (key: string): Promise<Record<string, any> | null> => {
      return StorageRetrieverMockResponse;
    }
  );

  const StorageRetrieverMock = jest.fn(() => ({
    retrieve: StorageRetrieverMockFunction
  }));

  return {
    StorageRetrieverMockResponse,
    StorageRetrieverMockFunction,
    StorageRetrieverMock
  };
}
