/**
 * Test for LegacyImplicitFlowOidcHandler
 */
import "reflect-metadata";
import LegacyImplicitFlowOidcHandler from "../../../../src/login/oidc/oidcHandlers/LegacyImplicitFlowOidcHandler";
import { DpopHeaderCreatorMock } from "../../../../src/util/dpop/__mocks__/DpopHeaderCreator";
import { FetcherMock } from "../../../../src/util/__mocks__/Fetcher";
import canHandleTests from "./OidcHandlerCanHandleTests";

describe("LegacyImplicitFlowOidcHandler", () => {
  const defaultMocks = {
    fetcher: FetcherMock,
    dpopHeaderCreator: DpopHeaderCreatorMock
  };
  function getLegacyImplicitFlowOidcHandler(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): LegacyImplicitFlowOidcHandler {
    return new LegacyImplicitFlowOidcHandler(
      mocks.fetcher ?? defaultMocks.fetcher,
      mocks.dpopHeaderCreator ?? defaultMocks.dpopHeaderCreator
    );
  }

  describe("canHandle", () => {
    const legacyImplicitFlowOidcHandler = getLegacyImplicitFlowOidcHandler();
    canHandleTests["legacyImplicitFlowOidcHandler"].forEach(testConfig => {
      it(testConfig.message, async () => {
        const value = await legacyImplicitFlowOidcHandler.canHandle(
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
