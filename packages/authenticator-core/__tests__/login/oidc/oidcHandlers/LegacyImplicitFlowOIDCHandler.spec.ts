/**
 * Test for LegacyImplicitFlowOidcHandler
 */
import "reflect-metadata";
import IRequestCredentials from "../../../../src/authenticatedFetch/IRequestCredentials";
import URL from "url-parse";
import LegacyImplicitFlowOidcHandler from "../../../../src/login/oidc/oidcHandlers/LegacyImplicitFlowOidcHandler";
import DpopHeaderCreatorMocks from "../../../../src/util/dpop/__mocks__/DpopHeaderCreator";
import FetcherMocks from "../../../../src/util/__mocks__/Fetcher";
import canHandleTests from "./OidcHandlerCanHandleTests";

describe("LegacyImplicitFlowOidcHandler", () => {
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  function initMocks() {
    const dpopHeaderCreatorMocks = DpopHeaderCreatorMocks();
    const fetcherMocks = FetcherMocks();
    return {
      ...dpopHeaderCreatorMocks,
      ...fetcherMocks,
      legacyImplicitFlowOidcHandler: new LegacyImplicitFlowOidcHandler(
        fetcherMocks.FetcherMock(),
        dpopHeaderCreatorMocks.DpopHeaderCreatorMock()
      )
    };
  }

  describe("canHandle", () => {
    const mocks = initMocks();
    canHandleTests["legacyImplicitFlowOidcHandler"].forEach(testConfig => {
      it(testConfig.message, async () => {
        const value = await mocks.legacyImplicitFlowOidcHandler.canHandle(
          testConfig.oidcOptions
        );
        expect(value).toBe(testConfig.shouldPass);
      });
    });
  });

  // TODO: add handle tests after redirect is handled properly
  // describe('handle', () => {
  //   it('is true', () => {
  //     expect(true).toEqual(true)
  //   })
  // })
});
