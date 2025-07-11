//
// Copyright Inrupt Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
// Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

import { jest, it, describe, expect } from "@jest/globals";
import type { IIssuerConfigFetcher } from "@inrupt/solid-client-authn-core";
import { StorageUtility } from "@inrupt/solid-client-authn-core";
import {
  StorageUtilityMock,
  mockStorage,
} from "@inrupt/solid-client-authn-core/mocks";
import { randomUUID } from "crypto";

import { OidcHandlerMock } from "./__mocks__/IOidcHandler";
import {
  IssuerConfigFetcherFetchConfigResponse,
  mockDefaultIssuerConfigFetcher,
  mockIssuerConfigFetcher,
} from "./__mocks__/IssuerConfigFetcher";
import OidcLoginHandler from "./OidcLoginHandler";
import { mockDefaultClientRegistrar } from "./__mocks__/ClientRegistrar";
import ClientRegistrar from "./ClientRegistrar";

jest.mock("@inrupt/oidc-client-ext");

describe("OidcLoginHandler", () => {
  const defaultMocks = {
    storageUtility: StorageUtilityMock,
    oidcHandler: OidcHandlerMock,
    issuerConfigFetcher: mockDefaultIssuerConfigFetcher(),
    clientRegistrar: mockDefaultClientRegistrar(),
  };
  function getInitialisedHandler(
    mocks: Partial<typeof defaultMocks> = defaultMocks,
  ): OidcLoginHandler {
    return new OidcLoginHandler(
      mocks.storageUtility ?? defaultMocks.storageUtility,
      mocks.oidcHandler ?? defaultMocks.oidcHandler,
      mocks.issuerConfigFetcher ?? defaultMocks.issuerConfigFetcher,
      mocks.clientRegistrar ?? defaultMocks.clientRegistrar,
    );
  }

  const oidcHandlerWithMocks = () => {
    const actualHandler = defaultMocks.oidcHandler;
    const issuerConfig = IssuerConfigFetcherFetchConfigResponse;
    const handler = getInitialisedHandler({
      issuerConfigFetcher: mockIssuerConfigFetcher(
        issuerConfig,
      ) as jest.Mocked<IIssuerConfigFetcher>,
      oidcHandler: actualHandler,
    });
    return { handler, mockOidcHandler: actualHandler };
  };

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
          // The value of the client ID doesn't matter.
          // This checks it gets passed through from storage to the handler.
          clientId: "https://example.org/some-client-id",
          clientType: "solid-oidc",
        },
      }),
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
    expect(calledWith.client.clientId).toBe(
      "https://example.org/some-client-id",
    );
  });

  it("should lookup client ID if not provided, if not found do DCR", async () => {
    const mockedOidcModule = jest.requireMock("@inrupt/oidc-client-ext") as any;
    mockedOidcModule.registerClient = (jest.fn() as any).mockResolvedValue({
      clientId: randomUUID(),
      clientSecret: randomUUID(),
    });

    const mockedEmptyStorage = new StorageUtility(
      mockStorage({}),
      mockStorage({}),
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
    const clientId = randomUUID();
    const mockedOidcModule = jest.requireMock("@inrupt/oidc-client-ext") as any;
    mockedOidcModule.registerClient = (jest.fn() as any).mockResolvedValue({
      clientId,
      clientSecret: randomUUID(),
    });

    const mockedEmptyStorage = new StorageUtility(
      mockStorage({}),
      mockStorage({}),
    );

    const actualHandler = defaultMocks.oidcHandler;
    const handler = getInitialisedHandler({
      oidcHandler: actualHandler,
      storageUtility: mockedEmptyStorage,
      clientRegistrar: new ClientRegistrar(mockedEmptyStorage),
      issuerConfigFetcher: mockIssuerConfigFetcher({
        ...IssuerConfigFetcherFetchConfigResponse,
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
    expect(calledWith.client.clientId).toBe(clientId);
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
      "clientId",
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
        scopesSupported: ["openid", "offline_access", "webid"],
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
      "clientId",
    );
    expect(storedClientId).toBe("https://my.app/registration#app");
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
      inputClientId,
    );

    expect(await actualStorage.getForUser("mySession", "clientSecret")).toEqual(
      inputClientSecret,
    );

    expect(await actualStorage.getForUser("mySession", "clientName")).toEqual(
      inputClientName,
    );
  });

  it("should throw an error when called without an issuer", async () => {
    const handler = getInitialisedHandler();
    // TS Ignore because bad input is purposely given here for the purpose of testing
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await expect(handler.handle({})).rejects.toThrow(
      "OidcLoginHandler requires an OIDC issuer",
    );
  });

  it("should throw an error when called without a redirect URL", async () => {
    const handler = getInitialisedHandler();
    await expect(
      handler.handle({
        sessionId: "doesn't matter",
        tokenType: "DPoP",
        oidcIssuer: "https://whatever.com",
      }),
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
      }),
    ).resolves.toBe(true);
  });

  it("should indicate it cannot handle logins without an issuer", async () => {
    const handler = getInitialisedHandler();
    await expect(handler.canHandle({} as any)).resolves.toBe(false);
  });

  it("should use the issuer's IRI from the fetched configuration rather than from the input options", async () => {
    const actualHandler = defaultMocks.oidcHandler;
    const issuerConfig = IssuerConfigFetcherFetchConfigResponse;
    issuerConfig.issuer = "https://some.issuer/";
    const handler = getInitialisedHandler({
      issuerConfigFetcher: mockIssuerConfigFetcher(
        issuerConfig,
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
      }),
    );
  });

  it("ignores malformed scopes", async () => {
    const { handler, mockOidcHandler } = oidcHandlerWithMocks();
    await handler.handle({
      sessionId: "mySession",
      oidcIssuer: "https://arbitrary.url",
      redirectUrl: "https://app.com/redirect",
      tokenType: "DPoP",
      keepAlive: false,
      customScopes: [
        // @ts-expect-error This tests misuse of the API.
        { not: "a string" },
        "some invalid scope including spaces",
        "valid_scope",
      ],
    });
    expect(mockOidcHandler.handle).toHaveBeenCalledWith(
      expect.objectContaining({
        scopes: ["openid", "offline_access", "webid", "valid_scope"],
      }),
    );
  });

  it("adds provided scopes to default ones", async () => {
    const { handler, mockOidcHandler } = oidcHandlerWithMocks();
    await handler.handle({
      sessionId: "mySession",
      oidcIssuer: "https://arbitrary.url",
      redirectUrl: "https://app.com/redirect",
      tokenType: "DPoP",
      keepAlive: false,
      customScopes: ["scope_1", "scope_2", "scope_3"],
    });
    expect(mockOidcHandler.handle).toHaveBeenCalledWith(
      expect.objectContaining({
        scopes: [
          "openid",
          "offline_access",
          "webid",
          "scope_1",
          "scope_2",
          "scope_3",
        ],
      }),
    );
  });

  it("de-dupes scopes", async () => {
    const { handler, mockOidcHandler } = oidcHandlerWithMocks();
    await handler.handle({
      sessionId: "mySession",
      oidcIssuer: "https://arbitrary.url",
      redirectUrl: "https://app.com/redirect",
      tokenType: "DPoP",
      keepAlive: false,
      customScopes: ["webid", "custom_scope", "custom_scope"],
    });
    expect(mockOidcHandler.handle).toHaveBeenCalledWith(
      expect.objectContaining({
        scopes: ["openid", "offline_access", "webid", "custom_scope"],
      }),
    );
  });
});
