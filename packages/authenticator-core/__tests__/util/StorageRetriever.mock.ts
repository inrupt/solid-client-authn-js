// import IRequestCredentials from '../../src/authenticatedFetch/IRequestCredentials'
// import { IFetcher } from '../../src/util/Fetcher'
// const mockFetch = mFetch as any
// import URL from 'url-parse'

// export default function StorageRetrieverMocks () {
//   const StorageRetrieverResponse = {
//     someObject: 'someObject'
//   }

//   const StorageRetrieverMockFunction = jest.fn(
//     async (creds: IRequestCredentials, url: URL, init: RequestInit) => {
//       return StorageRetrieverResponse
//     }
//   )

//   const FetcherMock = jest.fn<IFetcher, any[]>(() => ({
//     fetch: FetcherMockFunction as any
//   }))

//   return {
//     FetcherResponse,
//     FetcherMock,
//     FetcherMockFunction
//   }
// }
