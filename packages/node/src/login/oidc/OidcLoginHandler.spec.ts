/*
 * Copyright 2021 Inrupt Inc.
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

// Required by TSyringe:
import "reflect-metadata";
import {
  IIssuerConfigFetcher,
  mockStorageUtility,
} from "@inrupt/solid-client-authn-core";
import { OidcHandlerMock } from "./__mocks__/IOidcHandler";
import {
  IssuerConfigFetcherFetchConfigResponse,
  IssuerConfigFetcherMock,
  mockIssuerConfigFetcher,
} from "./__mocks__/IssuerConfigFetcher";
import OidcLoginHandler from "./OidcLoginHandler";
import {
  mockDefaultClient,
  mockDefaultClientRegistrar,
} from "./__mocks__/ClientRegistrar";

describe("OidcLoginHandler", () => {
  const defaultMocks = {
    storageUtility: mockStorageUtility({}),
    oidcHandler: OidcHandlerMock,
    issuerConfigFetcher: IssuerConfigFetcherMock,
    clientRegistrar: mockDefaultClientRegistrar(),
  };
  function getInitialisedHandler(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): OidcLoginHandler {
    return new OidcLoginHandler(
      mocks.storageUtility ?? defaultMocks.storageUtility,
      mocks.oidcHandler ?? defaultMocks.oidcHandler,
      mocks.issuerConfigFetcher ?? defaultMocks.issuerConfigFetcher,
      mocks.clientRegistrar ?? defaultMocks.clientRegistrar
    );
  }

  describe("canHandle", () => {
    it("cannot handle options without an issuer", async () => {
      const handler = getInitialisedHandler();
      await expect(
        handler.canHandle({
          sessionId: "mySession",
          tokenType: "DPoP",
          redirectUrl: "https://my.app/redirect",
        })
      ).resolves.toEqual(false);
    });

    // TODO: Move this to appropriate handlers (auth code, implicit)
    // it("cannot handle options without an redirect url", async () => {
    //   const handler = getInitialisedHandler();
    //   await expect(
    //     handler.canHandle({
    //       sessionId: "mySession",
    //       tokenType: "DPoP",
    //       oidcIssuer: "https://my.idp/",
    //     })
    //   ).resolves.toEqual(false);
    // });

    it("can handle options with both a redirect url and an issuer", async () => {
      const handler = getInitialisedHandler();
      await expect(
        handler.canHandle({
          sessionId: "mySession",
          tokenType: "DPoP",
          oidcIssuer: "https://my.idp/",
          redirectUrl: "https://my.app/redirect",
        })
      ).resolves.toEqual(true);
    });
  });

  describe("handle", () => {
    it("throws if config misses an issuer", async () => {
      const handler = getInitialisedHandler();
      await expect(
        handler.handle({
          sessionId: "mySession",
          tokenType: "DPoP",
          redirectUrl: "https://my.app/redirect",
        })
      ).rejects.toThrow("OidcLoginHandler requires an OIDC issuer");
    });

    // TODO: Move this to appropriate handlers (auth code, implicit)
    // it("throws if config misses a redirect URL", async () => {
    //   const handler = getInitialisedHandler();
    //   await expect(
    //     handler.handle({
    //       sessionId: "mySession",
    //       tokenType: "DPoP",
    //       oidcIssuer: "https://my.idp/",
    //     })
    //   ).rejects.toThrow("OidcLoginHandler requires a redirect URL");
    // });

    it("performs DCR if client ID and secret aren't specified", async () => {
      const { oidcHandler } = defaultMocks;
      const clientRegistrar = mockDefaultClientRegistrar();
      clientRegistrar.getClient = jest
        .fn()
        .mockResolvedValueOnce(mockDefaultClient());
      const handler = getInitialisedHandler({ oidcHandler, clientRegistrar });
      await handler.handle({
        sessionId: "mySession",
        oidcIssuer: "https://arbitrary.url",
        redirectUrl: "https://app.com/redirect",
        tokenType: "DPoP",
      });
      expect(clientRegistrar.getClient).toHaveBeenCalled();
    });

    it("does not perform DCR if client ID and secret are specified, but stores client credentials", async () => {
      const { oidcHandler } = defaultMocks;
      const mockedStorage = mockStorageUtility({});
      const clientRegistrar = mockDefaultClientRegistrar();
      clientRegistrar.getClient = jest
        .fn()
        .mockResolvedValueOnce(mockDefaultClient());
      const handler = getInitialisedHandler({
        oidcHandler,
        clientRegistrar,
        storageUtility: mockedStorage,
      });
      await handler.handle({
        sessionId: "mySession",
        oidcIssuer: "https://arbitrary.url",
        redirectUrl: "https://app.com/redirect",
        clientId: "some pre-registered client id",
        clientSecret: "some pre-registered client secret",
        clientName: "My App",
        tokenType: "DPoP",
      });
      expect(clientRegistrar.getClient).not.toHaveBeenCalled();
      await expect(
        mockedStorage.getForUser("mySession", "clientId")
      ).resolves.toEqual("some pre-registered client id");
      await expect(
        mockedStorage.getForUser("mySession", "clientSecret")
      ).resolves.toEqual("some pre-registered client secret");
      await expect(
        mockedStorage.getForUser("mySession", "clientName")
      ).resolves.toEqual("My App");
    });

    it("stores credentials for public clients", async () => {
      const { oidcHandler } = defaultMocks;
      const mockedStorage = mockStorageUtility({});
      const clientRegistrar = mockDefaultClientRegistrar();
      clientRegistrar.getClient = jest
        .fn()
        .mockResolvedValueOnce(mockDefaultClient());
      const handler = getInitialisedHandler({
        oidcHandler,
        clientRegistrar,
        storageUtility: mockedStorage,
      });
      await handler.handle({
        sessionId: "mySession",
        oidcIssuer: "https://arbitrary.url",
        redirectUrl: "https://app.com/redirect",
        clientId: "some pre-registered client id",
        tokenType: "DPoP",
      });
      expect(clientRegistrar.getClient).not.toHaveBeenCalled();
      await expect(
        mockedStorage.getForUser("mySession", "clientId")
      ).resolves.toEqual("some pre-registered client id");
    });

    it("uses the refresh token from storage if available", async () => {
      const { oidcHandler } = defaultMocks;
      const mockedStorage = mockStorageUtility({});
      await mockedStorage.setForUser("mySession", {
        refreshToken: "some token",
      });
      const clientRegistrar = mockDefaultClientRegistrar();
      clientRegistrar.getClient = jest
        .fn()
        .mockResolvedValueOnce(mockDefaultClient());
      const handler = getInitialisedHandler({
        oidcHandler,
        clientRegistrar,
        storageUtility: mockedStorage,
      });
      await handler.handle({
        sessionId: "mySession",
        oidcIssuer: "https://arbitrary.url",
        redirectUrl: "https://app.com/redirect",
        tokenType: "DPoP",
      });
      expect(oidcHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          refreshToken: "some token",
        })
      );
    });

    it("ignores the refresh token from storage if one is passed in arguments", async () => {
      const { oidcHandler } = defaultMocks;
      const mockedStorage = mockStorageUtility({});
      await mockedStorage.setForUser("mySession", {
        refreshToken: "some token",
      });
      const clientRegistrar = mockDefaultClientRegistrar();
      clientRegistrar.getClient = jest
        .fn()
        .mockResolvedValueOnce(mockDefaultClient());
      const handler = getInitialisedHandler({
        oidcHandler,
        clientRegistrar,
        storageUtility: mockedStorage,
      });
      await handler.handle({
        sessionId: "mySession",
        oidcIssuer: "https://arbitrary.url",
        redirectUrl: "https://app.com/redirect",
        tokenType: "DPoP",
        refreshToken: "some other refresh token",
      });
      expect(oidcHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          refreshToken: "some other refresh token",
        })
      );
    });

    it("should use the issuer's IRI from the fetched configuration rather than from the input options", async () => {
      const actualHandler = defaultMocks.oidcHandler;
      const issuerConfig = IssuerConfigFetcherFetchConfigResponse;
      issuerConfig.issuer = "https://some.issuer/";
      const handler = getInitialisedHandler({
        issuerConfigFetcher: mockIssuerConfigFetcher(
          issuerConfig
        ) as jest.Mocked<IIssuerConfigFetcher>,
        oidcHandler: actualHandler,
      });
      await handler.handle({
        sessionId: "mySession",
        oidcIssuer: "https://some.issuer",
        redirectUrl: "https://app.com/redirect",
        clientId: "coolApp",
        tokenType: "DPoP",
      });

      expect(actualHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          issuer: "https://some.issuer/",
        })
      );
    });
  });
});
