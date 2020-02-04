import { IStorageRetriever } from '../../src/util/StorageRetriever'

export default function StorageRetrieverMocks () {
  const StorageRetrieverMockResponse: Object = {
    someKey: 'someString'
  }

  const StorageRetrieverMockFunction = jest.fn(
    async (key: string) => {
      return StorageRetrieverMockResponse
    }
  )

  const StorageRetrieverMock: () => IStorageRetriever = jest.fn<IStorageRetriever, any[]>(() => ({
    retrieve: StorageRetrieverMockFunction
  }))

  return {
    StorageRetrieverMockResponse,
    StorageRetrieverMockFunction,
    StorageRetrieverMock
  }
}
