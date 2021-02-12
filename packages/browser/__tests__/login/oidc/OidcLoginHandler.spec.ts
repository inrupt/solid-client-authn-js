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
  StorageUtilityGetResponse,
  StorageUtilityMock,
} from "@inrupt/solid-client-authn-core";
import { OidcHandlerMock } from "../../../src/login/oidc/__mocks__/IOidcHandler";
import { IssuerConfigFetcherMock } from "../../../src/login/oidc/__mocks__/IssuerConfigFetcher";
import OidcLoginHandler from "../../../src/login/oidc/OidcLoginHandler";
import { ClientRegistrarMock } from "../../../src/login/oidc/__mocks__/ClientRegistrar";

describe("OidcLoginHandler", () => {
  const defaultMocks = {
    storageUtility: StorageUtilityMock,
    oidcHandler: OidcHandlerMock,
    issuerConfigFetcher: IssuerConfigFetcherMock,
    clientRegistrar: ClientRegistrarMock,
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

  it("should lookup client ID if not provided", async () => {
    const actualHandler = defaultMocks.oidcHandler;
    const handler = getInitialisedHandler({ oidcHandler: actualHandler });

    // If no 'clientId' passed in, we expect it to be looked up in storage
    // (which our test setup does).
    await handler.handle({
      sessionId: "mySession",
      oidcIssuer: "https://arbitrary.url",
      redirectUrl: "https://app.com/redirect",
      tokenType: "DPoP",
    });

    expect(actualHandler.handle.mock.calls).toHaveLength(1);

    const calledWith = actualHandler.handle.mock.calls[0][0];
    expect(calledWith.client.clientId).toEqual(StorageUtilityGetResponse);
  });

  it("should lookup client ID if not provided, if not found do DCR", async () => {
    // Override our default mock storage utility to deliberately return nothing.
    let savedValue: Record<string, string> = {};
    const NothingStoredMock = {
      ...StorageUtilityMock,
      getForUser: async (
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        userId: string,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        key: string,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        options?: { errorIfNull?: boolean; secure?: boolean }
      ) => undefined,

      // We expect only one call to our storage, so save whatever was set in a
      // single local variable.
      setForUser: async (
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        userId: string,
        values: Record<string, string>,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        options?: { secure?: boolean }
      ) => {
        savedValue = values;
      },
    };

    const actualHandler = defaultMocks.oidcHandler;
    const actualRegistrar = defaultMocks.clientRegistrar;
    const handler = getInitialisedHandler({
      oidcHandler: actualHandler,
      storageUtility: NothingStoredMock,
      clientRegistrar: actualRegistrar,
    });

    // We're not providing a client ID here (and we've explicitly cleared our
    // storage above), so we expect this call to use DCR to get a client ID...
    await handler.handle({
      sessionId: "mySession",
      oidcIssuer: "https://arbitrary.url",
      redirectUrl: "https://app.com/redirect",
      tokenType: "DPoP",
    });

    expect(actualHandler.handle.mock.calls).toHaveLength(1);
    expect(actualRegistrar.getClient.mock.calls).toHaveLength(1);

    // Get the response from the expected mocked DCR call, and ensure it matches
    // the value we expect to have been stored in our storage.
    const registrarResult = await actualRegistrar.getClient.mock.results[0]
      .value;
    expect(registrarResult.clientId).toEqual(savedValue.clientId);
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
});
