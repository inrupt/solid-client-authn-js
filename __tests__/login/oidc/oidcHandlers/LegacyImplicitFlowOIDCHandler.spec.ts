/**
 * Test for LegacyImplicitFlowOidcHandler
 */
import "reflect-metadata";
import LegacyImplicitFlowOidcHandler from "../../../../src/login/oidc/oidcHandlers/LegacyImplicitFlowOidcHandler";
import { DpopHeaderCreatorMock } from "../../../../src/dpop/__mocks__/DpopHeaderCreator";
import { FetcherMock } from "../../../../src/util/__mocks__/Fetcher";
import canHandleTests from "./OidcHandlerCanHandleTests";
import { SessionCreatorMock } from "../../../../src/solidSession/__mocks__/SessionCreator";
import ISolidSession from "../../../../src/solidSession/ISolidSession";
import IOidcOptions from "../../../../src/login/oidc/IOidcOptions";
import { standardOidcOptions } from "../../../../src/login/oidc/__mocks__/IOidcOptions";

describe("LegacyImplicitFlowOidcHandler", () => {
  const defaultMocks = {
    fetcher: FetcherMock,
    dpopHeaderCreator: DpopHeaderCreatorMock,
    sessionCreator: SessionCreatorMock
  };
  function getLegacyImplicitFlowOidcHandler(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): LegacyImplicitFlowOidcHandler {
    return new LegacyImplicitFlowOidcHandler(
      mocks.fetcher ?? defaultMocks.fetcher,
      mocks.dpopHeaderCreator ?? defaultMocks.dpopHeaderCreator,
      mocks.sessionCreator ?? defaultMocks.sessionCreator
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

  describe("handle", () => {
    it("Creates the right session with dpop ", async () => {
      const legacyImplicitFlowOidcHandler = getLegacyImplicitFlowOidcHandler();
      const oidcOptions: IOidcOptions = {
        ...standardOidcOptions
      };
      const session: ISolidSession = await legacyImplicitFlowOidcHandler.handle(
        oidcOptions
      );
      expect(defaultMocks.sessionCreator.create).toHaveBeenCalledWith({
        loggedIn: false,
        neededAction: {
          actionType: "redirect",
          redirectUrl:
            "https://example.com/auth?response_type=id_token%20token&redirect_url=https%3A%2F%2Fapp.example.com&scope=openid%20id_vc&dpop=someToken"
        }
      });
    });

    it("Creates the right session without dpop", async () => {
      const legacyImplicitFlowOidcHandler = getLegacyImplicitFlowOidcHandler();
      const oidcOptions: IOidcOptions = {
        ...standardOidcOptions,
        dpop: false
      };
      const session: ISolidSession = await legacyImplicitFlowOidcHandler.handle(
        oidcOptions
      );
      expect(defaultMocks.sessionCreator.create).toHaveBeenCalledWith({
        loggedIn: false,
        neededAction: {
          actionType: "redirect",
          redirectUrl:
            "https://example.com/auth?response_type=id_token%20token&redirect_url=https%3A%2F%2Fapp.example.com&scope=openid%20id_vc"
        }
      });
    });
  });
});
