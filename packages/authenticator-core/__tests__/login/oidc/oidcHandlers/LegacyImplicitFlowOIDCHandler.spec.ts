/**
 * Test for LegacyImplicitFlowOIDCHandler
 */
import 'reflect-metadata'
import IRequestCredentials from '../../../../src/authenticatedFetch/IRequestCredentials'
import URL from 'url-parse'
import LegacyImplicitFlowOIDCHandler from '../../../../src/login/oidc/oidcHandlers/LegacyImplicitFlowOIDCHandler'
import DPoPHeaderCreatorMocks from '../../../util/dpop/DPoPHeaderCrator.mock'
import FetcherMocks from '../../../util/Fetcher.mock'
import canHandleTests from './OIDCHandlerCanHandleTests'

describe('LegacyImplicitFlowOIDCHandler', () => {

  function initMocks () {
    const dPoPHeaderCreatorMocks = DPoPHeaderCreatorMocks()
    const fetcherMocks = FetcherMocks()
    return {
      ...dPoPHeaderCreatorMocks,
      ...fetcherMocks,
      legacyImplicitFlowOIDCHandler: new LegacyImplicitFlowOIDCHandler(
        fetcherMocks.FetcherMock(),
        dPoPHeaderCreatorMocks.DPoPHeaderCreatorMock()
      )
    }
  }

  describe('canHandle', () => {
    const mocks = initMocks()
    canHandleTests['legacyImplicitFlowOIDCHandler'].forEach((testConfig) => {
      it(testConfig.message, async () => {
        const value = await mocks.legacyImplicitFlowOIDCHandler.canHandle(testConfig.oidcOptions)
        expect(value).toBe(testConfig.shouldPass)
      })
    })
  })

  // TODO: add handle tests after redirect is handled properly
  // describe('handle', () => {
  //   it('is true', () => {
  //     expect(true).toEqual(true)
  //   })
  // })
})
