/**
 * Test for DPoPAuthenticatedFetcher
 */
import 'reflect-metadata'
import DPoPAuthenticatedFetcher from '../../../src/authenticatedFetch/dPoP/DPoPAuthenticatedFetcher'
import URL from 'url-parse'
import IRequestCredentials from '../../../src/authenticatedFetch/IRequestCredentials'
import DPoPHeaderCreatorMocks from '../../util/dpop/DPoPHeaderCrator.mock'
import FetcherMocks from '../../util/Fetcher.mock'

describe('DPoPAuthenticatedFetcher', () => {

  let DPoPHeaderCreatorResponse: string
  let DPoPHeaderCreatorMockFunction: jest.Mock<Promise<string>, [URL, string]>

  let FetcherResponse: any
  let FetcherMockFunction: jest.Mock<Promise<Response>, [IRequestCredentials, URL, RequestInit]>

  let dPoPAuthenticatedFetcher: DPoPAuthenticatedFetcher

  beforeEach(() => {
    // DPoPHeaderCreator
    const dPoPHeaderCreatorMocks = DPoPHeaderCreatorMocks()
    DPoPHeaderCreatorResponse = dPoPHeaderCreatorMocks.DPoPHeaderCreatorResponse
    DPoPHeaderCreatorMockFunction = dPoPHeaderCreatorMocks.DPoPHeaderCreatorMockFunction

    // Fetcher
    const fetcherMocks = FetcherMocks()
    FetcherResponse = fetcherMocks.FetcherResponse
    FetcherMockFunction = fetcherMocks.FetcherMockFunction

    dPoPAuthenticatedFetcher = new DPoPAuthenticatedFetcher(
      dPoPHeaderCreatorMocks.DPoPHeaderCreatorMock(),
      fetcherMocks.FetcherMock()
    )
  })

  describe('canHandle', () => {
    it('accepts configs with type dpop', async () => {
      expect(
        await dPoPAuthenticatedFetcher
          .canHandle({ type: 'dpop' }, new URL('http://example.com'), {})
      ).toBe(true)
    })

    it('rejects configs without type dpop', async () => {
      expect(
        await dPoPAuthenticatedFetcher
          .canHandle({ type: 'bearer' }, new URL('http://example.com'), {})
      ).toBe(false)
    })
  })

  describe('handle', () => {
    it('should throw an error on a bad config', () => {
      /* tslint:disable */
      expect(dPoPAuthenticatedFetcher.handle(
        { type: 'bad' },
        new URL('https://bad.com'),
        {}
      )).rejects.toThrowError()
    })

    it ('handles request properly', async () => {
      const url = new URL('https://example.com')
      const requestCredentials = {
        type: 'dpop',
        authToken: 'someAuthToken'
      }
      const init = {}
      const response = await dPoPAuthenticatedFetcher.handle(
        requestCredentials,
        url,
        init
      )
      expect(DPoPHeaderCreatorMockFunction).toHaveBeenCalledWith(url, 'GET')
      expect(FetcherMockFunction).toHaveBeenCalledWith(url, {
        headers: {
          authorization: `DPOP ${requestCredentials.authToken}`,
          dpop: DPoPHeaderCreatorResponse
        }
      })
      expect(response).toBe(FetcherResponse)
    })
  })

  // TODO: Create a test Where no init is provided

})