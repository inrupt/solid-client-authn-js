/**
 * Test for DPoPAuthenticatedFetcher
 */
import 'reflect-metadata'
import DPoPAuthenticatedFetcher from '../../../src/authenticatedFetch/dPoP/DPoPAuthenticatedFetcher'
import { IDPoPHeaderCreator } from '../../../src/util/dpop/DPoPHeaderCreator'
import { IFetcher } from '../../../src/util/Fetcher'
import URL from 'url-parse'
import IRequestCredentials from '../../../src/authenticatedFetch/IRequestCredentials'
import mFetch from 'jest-fetch-mock'
const mockFetch = mFetch as any

describe('DPoPAuthenticatedFetcher', () => {

  let DPoPHeaderCreatorResponse: string
  let DPoPHeaderCreatorMockFunction: jest.Mock<Promise<string>, [URL, string]>

  let FetcherResponse: any
  let FetcherMockFunction: jest.Mock<Promise<Response>, [IRequestCredentials, URL, RequestInit]>

  let dPoPAuthenticatedFetcher: DPoPAuthenticatedFetcher

  beforeEach(() => {
    // DPoPHeaderCreator
    DPoPHeaderCreatorResponse = 'someToken'

    DPoPHeaderCreatorMockFunction = jest.fn(async (audience: URL, method: string) => {
      return DPoPHeaderCreatorResponse
    })

    const DPoPHeaderCreatorMock = jest.fn<IDPoPHeaderCreator, any[]>(() => ({
      createHeaderToken: DPoPHeaderCreatorMockFunction
    }))

    // Fetcher
    FetcherResponse = mockFetch.mockResponse('someResponse')

    FetcherMockFunction = jest.fn(
      async (creds: IRequestCredentials, url: URL, init: RequestInit) => {
        return FetcherResponse
      }
    )

    const FetcherMock = jest.fn<IFetcher, any[]>(() => ({
      fetch: FetcherMockFunction as any
    }))

    dPoPAuthenticatedFetcher = new DPoPAuthenticatedFetcher(
      DPoPHeaderCreatorMock(),
      FetcherMock()
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