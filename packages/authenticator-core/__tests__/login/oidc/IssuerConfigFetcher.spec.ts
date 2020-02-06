import 'reflect-metadata'
import FetcherMocks from '../../util/Fetcher.mock'
import StorageRetrieverMocks from '../../util/StorageRetriever.mock'
import StorageMocks from '../../authenticator/Storage.mock'
import IssuerConfigFetcher from '../../../src/login/oidc/IssuerConfigFetcher'

/**
 * Test for IssuerConfigFetcher
 */
describe('IssuerConfigFetcher', () => {

  function initMocks () {
    const fetcherMocks = FetcherMocks()
    const storageRetrieverMocks = StorageRetrieverMocks()
    const storageMocks = StorageMocks()
    return {
      ...fetcherMocks,
      ...storageRetrieverMocks,
      ...storageMocks,
      issuerConfigFetcher: new IssuerConfigFetcher(
        fetcherMocks.FetcherMock(),
        storageRetrieverMocks.StorageRetrieverMock(),
        storageMocks.StorageMock()
      )
    }
  }

  it('trivial', () => {
    expect(true).toBe(true)
  })

  // describe ('fetchConfig', () => {
  //   it ('uses a valid locally stored configuration instead of fetching one', () => {

  //   })
  //   it ('fetches a valid configuration ')
  // })

  // describe ('issuerConfigSchema', () => {
  //   const issuerConfigs:  = {

  //   }

  // })
})
