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

import "reflect-metadata";
import {
  StorageUtilityMock,
  IClient,
  IClientRegistrar,
  IClientRegistrarOptions,
  IIssuerConfigFetcher,
  IIssuerConfig,
} from "@inrupt/solid-client-authn-core";
import { AuthCodeRedirectHandler } from "./AuthCodeRedirectHandler";
import { RedirectorMock } from "../__mocks__/Redirector";
import { SessionInfoManagerMock } from "../../../sessionInfo/__mocks__/SessionInfoManager";

const mockIssuer = (): IIssuerConfig => {
  return {
    issuer: "https://some.issuer",
    authorizationEndpoint: "https://some.issuer/autorization",
    tokenEndpoint: "https://some.issuer/token",
    jwksUri: "https://some.issuer/keys",
    claimsSupported: ["code", "openid"],
    subjectTypesSupported: ["public", "pairwise"],
    registrationEndpoint: "https://some.issuer/registration",
    grantTypesSupported: ["authorization_code"],
  };
};

function mockIssuerConfigFetcher(config: IIssuerConfig): IIssuerConfigFetcher {
  return {
    fetchConfig: async (): Promise<IIssuerConfig> => config,
  };
}

const mockClient = (): IClient => {
  return {
    clientId: "some client",
  };
};

function mockClientRegistrar(client: IClient): IClientRegistrar {
  return {
    getClient: async (
      _options: IClientRegistrarOptions,
      _issuer: IIssuerConfig
    ): Promise<IClient> => client,
  };
}

const defaultMocks = {
  storageUtility: StorageUtilityMock,
  redirector: RedirectorMock,
  sessionInfoManager: SessionInfoManagerMock,
  clientRegistrar: mockClientRegistrar(mockClient()),
  issuerConfigFetcher: mockIssuerConfigFetcher(mockIssuer()),
};

function getAuthCodeRedirectHandler(
  mocks: Partial<typeof defaultMocks> = defaultMocks
): AuthCodeRedirectHandler {
  return new AuthCodeRedirectHandler(
    mocks.storageUtility ?? defaultMocks.storageUtility,
    mocks.sessionInfoManager ?? defaultMocks.sessionInfoManager,
    mocks.issuerConfigFetcher ?? defaultMocks.issuerConfigFetcher,
    mocks.clientRegistrar ?? defaultMocks.clientRegistrar
  );
}

describe("AuthCodeRedirectHandler", () => {
  describe("canHandler", () => {
    it("Accepts a valid url with the correct query", async () => {
      const authCodeRedirectHandler = getAuthCodeRedirectHandler();
      expect(
        await authCodeRedirectHandler.canHandle(
          "https://coolparty.com/?code=someCode&state=oauth2_state_value"
        )
      ).toBe(true);
    });

    it("throws on invalid url", async () => {
      const authCodeRedirectHandler = getAuthCodeRedirectHandler();
      await expect(() =>
        authCodeRedirectHandler.canHandle("beep boop I am a robot")
      ).rejects.toThrow(
        "[beep boop I am a robot] is not a valid URL, and cannot be used as a redirect URL"
      );
    });

    it("Rejects a valid url with the incorrect query", async () => {
      const authCodeRedirectHandler = getAuthCodeRedirectHandler();
      expect(
        await authCodeRedirectHandler.canHandle(
          "https://coolparty.com/?meep=mop"
        )
      ).toBe(false);
    });

    it("rejects a valid url without authorization code", async () => {
      const authCodeRedirectHandler = getAuthCodeRedirectHandler();
      expect(
        await authCodeRedirectHandler.canHandle(
          "https://coolparty.com/?state=someState"
        )
      ).toBe(false);
    });

    it("rejects a valid url without state", async () => {
      const authCodeRedirectHandler = getAuthCodeRedirectHandler();
      expect(
        await authCodeRedirectHandler.canHandle(
          "https://coolparty.com/?code=someCode"
        )
      ).toBe(false);
    });
  });

  describe("handle", () => {
    it("throws on non-redirect URL", async () => {
      const authCodeRedirectHandler = getAuthCodeRedirectHandler();
      await expect(
        authCodeRedirectHandler.handle("https://my.app")
      ).rejects.toThrow(
        "AuthCodeRedirectHandler cannot handle [https://my.app]: it is missing one of [code, state]."
      );
    });

    it("isn't implemented", async () => {
      const authCodeRedirectHandler = getAuthCodeRedirectHandler();

      await expect(
        authCodeRedirectHandler.handle(
          "https://coolsite.com/?code=someCode&state=oauth2_state_value"
        )
      ).rejects.toThrow("not implemented");
    });
  });
});
