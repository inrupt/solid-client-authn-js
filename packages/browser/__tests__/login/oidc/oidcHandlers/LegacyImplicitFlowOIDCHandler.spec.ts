/*
 * Copyright 2020 Inrupt Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * Test for LegacyImplicitFlowOidcHandler
 */
import "reflect-metadata";
import LegacyImplicitFlowOidcHandler from "../../../../src/login/oidc/oidcHandlers/LegacyImplicitFlowOidcHandler";
import { FetcherMock } from "../../../../src/util/__mocks__/Fetcher";
import canHandleTests from "./OidcHandlerCanHandleTests";
import { SessionInfoManagerMock } from "../../../../src/sessionInfo/__mocks__/SessionInfoManager";
import { standardOidcOptions } from "../../../../src/login/oidc/__mocks__/IOidcOptions";
import { RedirectorMock } from "../../../../src/login/oidc/__mocks__/Redirector";
import {
  IOidcOptions,
  StorageUtilityMock,
} from "@inrupt/solid-client-authn-core";
import { JSONWebKey } from "jose";

const mockJWK = {
  kty: "EC",
  kid: "oOArcXxcwvsaG21jAx_D5CHr4BgVCzCEtlfmNFQtU0s",
  alg: "ES256",
  crv: "P-256",
  x: "0dGe_s-urLhD3mpqYqmSXrqUZApVV5ZNxMJXg7Vp-2A",
  y: "-oMe9gGkpfIrnJ0aiSUHMdjqYVm5ZrGCeQmRKoIIfj8",
  d: "yR1bCsR7m4hjFCvWo8Jw3OfNR4aiYDAFbBD9nkudJKM",
};

jest.mock("@inrupt/oidc-client-ext", () => {
  return {
    generateJwkForDpop: async (): Promise<typeof mockJWK> => mockJWK,
    createDpopHeader: async (
      _audience: string,
      _method: string,
      _jwt: JSONWebKey
    ): Promise<string> => "someToken",
  };
});

describe("LegacyImplicitFlowOidcHandler", () => {
  const defaultMocks = {
    fetcher: FetcherMock,
    sessionInfoManager: SessionInfoManagerMock,
    redirector: RedirectorMock,
    storageUtility: StorageUtilityMock,
  };
  function getLegacyImplicitFlowOidcHandler(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): LegacyImplicitFlowOidcHandler {
    return new LegacyImplicitFlowOidcHandler(
      mocks.fetcher ?? defaultMocks.fetcher,
      mocks.sessionInfoManager ?? defaultMocks.sessionInfoManager,
      mocks.redirector ?? defaultMocks.redirector,
      mocks.storageUtility ?? defaultMocks.storageUtility
    );
  }

  describe("canHandle", () => {
    const legacyImplicitFlowOidcHandler = getLegacyImplicitFlowOidcHandler();
    canHandleTests["legacyImplicitFlowOidcHandler"].forEach((testConfig) => {
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
        ...standardOidcOptions,
      };
      await legacyImplicitFlowOidcHandler.handle(oidcOptions);
      expect(
        defaultMocks.redirector.redirect
      ).toHaveBeenCalledWith(
        "https://example.com/auth?client_id=coolApp&response_type=id_token+token&redirect_uri=https%3A%2F%2Fapp.example.com&scope=openid+webid+offline_access&state=mySession&dpop=someToken",
        { handleRedirect: standardOidcOptions.handleRedirect }
      );
    });

    it("Creates the right session without dpop", async () => {
      const legacyImplicitFlowOidcHandler = getLegacyImplicitFlowOidcHandler();
      const oidcOptions: IOidcOptions = {
        ...standardOidcOptions,
        dpop: false,
      };
      await legacyImplicitFlowOidcHandler.handle(oidcOptions);
      expect(
        defaultMocks.redirector.redirect
      ).toHaveBeenCalledWith(
        "https://example.com/auth?client_id=coolApp&response_type=id_token+token&redirect_uri=https%3A%2F%2Fapp.example.com&scope=openid+webid+offline_access&state=mySession",
        { handleRedirect: standardOidcOptions.handleRedirect }
      );
    });
  });
});
