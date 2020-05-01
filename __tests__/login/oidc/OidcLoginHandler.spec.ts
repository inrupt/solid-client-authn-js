/**
 * Proprietary and Confidential
 *
 * Copyright 2020 Inrupt Inc. - all rights reserved.
 *
 * Do not use without explicit permission from Inrupt Inc.
 */

// Required by TSyringe:
import "reflect-metadata";
import { OidcHandlerMock } from "../../../src/login/oidc/__mocks__/IOidcHandler";
import { IssuerConfigFetcherMock } from "../../../src/login/oidc/__mocks__/IssuerConfigFetcher";
import OidcLoginHandler from "../../../src/login/oidc/OidcLoginHandler";
import IOidcHandler from "../../../src/login/oidc/IOidcHandler";
import URL from "url-parse";
import { StorageUtilityMock } from "../../../src/localStorage/__mocks__/StorageUtility";
import { DpopClientKeyManagerMock } from "../../../src/dpop/__mocks__/DpopClientKeyManager";

/* eslint-disable @typescript-eslint/ban-ts-ignore */

describe("OidcLoginHandler", () => {
  const defaultMocks = {
    oidcHandler: OidcHandlerMock,
    issuerConfigFetcher: IssuerConfigFetcherMock,
    dpopClientKeyManager: DpopClientKeyManagerMock,
    storageUtility: StorageUtilityMock
  };
  function getInitialisedHandler(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): OidcLoginHandler {
    return new OidcLoginHandler(
      mocks.oidcHandler ?? defaultMocks.oidcHandler,
      mocks.issuerConfigFetcher ?? defaultMocks.issuerConfigFetcher,
      mocks.dpopClientKeyManager ?? defaultMocks.dpopClientKeyManager,
      mocks.storageUtility ?? defaultMocks.storageUtility
    );
  }

  it("should call the actual handler when an Oidc Issuer is provided", async () => {
    const actualHandler = defaultMocks.oidcHandler;
    const handler = getInitialisedHandler({ oidcHandler: actualHandler });
    await handler.handle({
      oidcIssuer: new URL("https://arbitrary.url"),
      redirect: new URL("https://app.com/redirect"),
      clientId: "coolApp"
    });

    expect(actualHandler.handle.mock.calls.length).toBe(1);
  });

  it("should throw an error when called without an issuer", async () => {
    const handler = getInitialisedHandler();
    // TS Ignore because bad input is purposely given here for the purpose of testing
    // @ts-ignore
    await expect(handler.handle({})).rejects.toThrowError(
      "OidcLoginHandler requires an oidcIssuer"
    );
  });

  it("should indicate it when it can handle logins", async () => {
    const handler = getInitialisedHandler();

    await expect(
      handler.canHandle({
        oidcIssuer: new URL("https://arbitrary.url"),
        redirect: new URL("https://app.com/redirect"),
        clientId: "coolApp"
      })
    ).resolves.toBe(true);
  });

  it("should indicate it cannot handle logins without an issuer", async () => {
    const handler = getInitialisedHandler();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(handler.canHandle({} as any)).resolves.toBe(false);
  });
});
