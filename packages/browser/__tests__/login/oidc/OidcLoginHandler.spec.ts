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

import { jest, it, describe, expect } from "@jest/globals";
import {
  IIssuerConfigFetcher,
  StorageUtility,
  StorageUtilityMock,
} from "@inrupt/solid-client-authn-core";
import { mockStorage } from "@inrupt/solid-client-authn-core/dist/storage/__mocks__/StorageUtility";
import { OidcHandlerMock } from "../../../src/login/oidc/__mocks__/IOidcHandler";
import {
  IssuerConfigFetcherFetchConfigResponse,
  mockDefaultIssuerConfigFetcher,
  mockIssuerConfigFetcher,
} from "../../../src/login/oidc/__mocks__/IssuerConfigFetcher";
import OidcLoginHandler from "../../../src/login/oidc/OidcLoginHandler";
import { mockDefaultClientRegistrar } from "../../../src/login/oidc/__mocks__/ClientRegistrar";
import ClientRegistrar from "../../../src/login/oidc/ClientRegistrar";

jest.mock("@inrupt/oidc-client-ext");

describe("OidcLoginHandler", () => {
  const defaultMocks = {
    storageUtility: StorageUtilityMock,
    oidcHandler: OidcHandlerMock,
    issuerConfigFetcher: mockDefaultIssuerConfigFetcher(),
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

  it("should call the actual handler when an Oidc Issuer is provided", async () => {
    const actualHandler = defaultMocks.oidcHandler;
    const handler = getInitialisedHandler({ oidcHandler: actualHandler });
    await handler.handle({
      sessionId: "mySession",
      oidcIssuer: "https://arbitrary.url",
      redirectUrl: "https://app.com/redirect",
      clientId: "coolApp",
      tokenType: "DPoP",
    });

    expect(actualHandler.handle.mock.calls).toHaveLength(1);
  });

  it("should retrieve client ID from storage if one is not provided", async () => {
    const actualHandler = defaultMocks.oidcHandler;
    const mockedStorage = new StorageUtility(
      mockStorage({}),
      mockStorage({
        "solidClientAuthenticationUser:mySession": {
          // The value of the client ID doesn't matter here, and it could be a WebID.
          // This checks it gets passed through from storage to the handler.
          clientId: "some client ID",
        },
      })
    );
    const handler = getInitialisedHandler({
      oidcHandler: actualHandler,
      storageUtility: mockedStorage,
      clientRegistrar: new ClientRegistrar(mockedStorage),
    });

    await handler.handle({
      sessionId: "mySession",
      oidcIssuer: "https://arbitrary.url",
      redirectUrl: "https://app.com/redirect",
      tokenType: "DPoP",
    });

    expect(actualHandler.handle.mock.calls).toHaveLength(1);

    const calledWith = actualHandler.handle.mock.calls[0][0];
    expect(calledWith.client.clientId).toEqual("some client ID");
  });

  it("should lookup client ID if not provided, if not found do DCR", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockedOidcModule = jest.requireMock("@inrupt/oidc-client-ext") as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedOidcModule.registerClient = (jest.fn() as any).mockResolvedValue({
      clientId: "some dynamically registered ID",
      clientSecret: "some dynamically registered secret",
    });

    const mockedEmptyStorage = new StorageUtility(
      mockStorage({}),
      mockStorage({})
    );

    const actualHandler = defaultMocks.oidcHandler;
    const handler = getInitialisedHandler({
      oidcHandler: actualHandler,
      storageUtility: mockedEmptyStorage,
      clientRegistrar: new ClientRegistrar(mockedEmptyStorage),
    });

    await handler.handle({
      sessionId: "mySession",
      oidcIssuer: "https://arbitrary.url",
      redirectUrl: "https://app.com/redirect",
      tokenType: "DPoP",
    });

    expect(mockedOidcModule.registerClient).toHaveBeenCalled();
  });

  it("should perform DCR if a client WebID is provided, but the target IdP does not support Solid-OIDC", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockedOidcModule = jest.requireMock("@inrupt/oidc-client-ext") as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedOidcModule.registerClient = (jest.fn() as any).mockResolvedValue({
      clientId: "some dynamically registered ID",
      clientSecret: "some dynamically registered secret",
    });

    const mockedEmptyStorage = new StorageUtility(
      mockStorage({}),
      mockStorage({})
    );

    const actualHandler = defaultMocks.oidcHandler;
    const handler = getInitialisedHandler({
      oidcHandler: actualHandler,
      storageUtility: mockedEmptyStorage,
      clientRegistrar: new ClientRegistrar(mockedEmptyStorage),
      issuerConfigFetcher: mockIssuerConfigFetcher({
        ...IssuerConfigFetcherFetchConfigResponse,
        // Solid-OIDC is not supported by the Identity Provider, so the provided
        // client WebID cannot be used, and the client must go through DCR instead.
        solidOidcSupported: undefined,
      }),
    });

    await handler.handle({
      sessionId: "mySession",
      oidcIssuer: "https://arbitrary.url",
      redirectUrl: "https://app.com/redirect",
      tokenType: "DPoP",
      clientId: "https://my.app/registration#app",
    });

    const calledWith = actualHandler.handle.mock.calls[0][0];
    expect(calledWith.client.clientId).toEqual(
      "some dynamically registered ID"
    );
  });

  it("should save statically registered client ID if given one as an input option", async () => {
    const actualStorage = new StorageUtility(mockStorage({}), mockStorage({}));
    const handler = getInitialisedHandler({
      storageUtility: actualStorage,
    });

    const inputClientId = "coolApp";

    await handler.handle({
      sessionId: "mySession",
      oidcIssuer: "https://arbitrary.url",
      redirectUrl: "https://app.com/redirect",
      clientId: inputClientId,
      tokenType: "DPoP",
    });

    const storedClientId = await actualStorage.getForUser(
      "mySession",
      "clientId"
    );
    expect(storedClientId).toEqual(inputClientId);
  });

  it("should save client WebID if one is provided, and the target IdP supports Solid-OIDC", async () => {
    const mockedStorage = new StorageUtility(mockStorage({}), mockStorage({}));

    const actualHandler = defaultMocks.oidcHandler;
    const handler = getInitialisedHandler({
      oidcHandler: actualHandler,
      storageUtility: mockedStorage,
      clientRegistrar: new ClientRegistrar(mockedStorage),
      issuerConfigFetcher: mockIssuerConfigFetcher({
        ...IssuerConfigFetcherFetchConfigResponse,
        solidOidcSupported: "https://solidproject.org/TR/solid-oidc",
      }),
    });

    await handler.handle({
      sessionId: "mySession",
      oidcIssuer: "https://arbitrary.url",
      redirectUrl: "https://app.com/redirect",
      tokenType: "DPoP",
      clientId: "https://my.app/registration#app",
    });

    const calledWith = actualHandler.handle.mock.calls[0][0];
    expect(calledWith.client.clientId).toBe("https://my.app/registration#app");

    const storedClientId = await mockedStorage.getForUser(
      "mySession",
      "clientId"
    );
    expect(storedClientId).toEqual("https://my.app/registration#app");
  });

  it("should save client ID, secret and name if given as input options", async () => {
    const actualStorage = new StorageUtility(mockStorage({}), mockStorage({}));
    const handler = getInitialisedHandler({
      storageUtility: actualStorage,
    });

    const inputClientId = "coolApp";
    const inputClientSecret = "Top Secret!";
    const inputClientName = "The coolest app around";

    await handler.handle({
      sessionId: "mySession",
      oidcIssuer: "https://arbitrary.url",
      redirectUrl: "https://app.com/redirect",
      clientId: inputClientId,
      clientSecret: inputClientSecret,
      clientName: inputClientName,
      tokenType: "DPoP",
    });

    expect(await actualStorage.getForUser("mySession", "clientId")).toEqual(
      inputClientId
    );

    expect(await actualStorage.getForUser("mySession", "clientSecret")).toEqual(
      inputClientSecret
    );

    expect(await actualStorage.getForUser("mySession", "clientName")).toEqual(
      inputClientName
    );
  });

  it("should throw an error when called without an issuer", async () => {
    const handler = getInitialisedHandler();
    // TS Ignore because bad input is purposely given here for the purpose of testing
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await expect(handler.handle({})).rejects.toThrow(
      "OidcLoginHandler requires an OIDC issuer"
    );
  });

  it("should throw an error when called without a redirect URL", async () => {
    const handler = getInitialisedHandler();
    await expect(
      handler.handle({
        sessionId: "doesn't matter",
        tokenType: "DPoP",
        oidcIssuer: "https://whatever.com",
      })
    ).rejects.toThrow("OidcLoginHandler requires a redirect URL");
  });

  it("should indicate when it can handle logins", async () => {
    const handler = getInitialisedHandler();

    await expect(
      handler.canHandle({
        sessionId: "mySession",
        oidcIssuer: "https://arbitrary.url",
        redirectUrl: "https://app.com/redirect",
        clientId: "coolApp",
        tokenType: "DPoP",
      })
    ).resolves.toBe(true);
  });

  it("should indicate it cannot handle logins without an issuer", async () => {
    const handler = getInitialisedHandler();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(handler.canHandle({} as any)).resolves.toBe(false);
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
