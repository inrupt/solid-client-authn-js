// Required by TSyringe:
import "reflect-metadata";
import { MockOidcHandler } from "../../../src/login/oidc/__mocks__/IOidcHandler";
import { MockIssuerConfigFetcher } from "../../../src/login/oidc/__mocks__/IIssuerConfigFetcher";
import OidcLoginHandler from "../../../src/login/oidc/OidcLoginHandler";
import IOidcHandler from "../../../src/login/oidc/IOidcHandler";
import URL from "url-parse";
import { IIssuerConfigFetcher } from "../../../src/login/oidc/IssuerConfigFetcher";
import { IDpopClientKeyManager } from "../../../src/util/dpop/DpopClientKeyManager";
import DpopClientKeyManagerMocks from "../../../src/util/dpop/__mocks__/DpopClientKeyManager";

/* eslint-disable @typescript-eslint/ban-ts-ignore */

describe("OidcLoginHandler", () => {
  const defaultMocks = {
    oidcHandler: MockOidcHandler,
    issuerConfigFetcher: MockIssuerConfigFetcher,
    dpopClientKeyManager: DpopClientKeyManagerMocks().DpopClientKeyManagerMock
  };
  function getInitialisedHandler(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): OidcLoginHandler {
    return new OidcLoginHandler(
      mocks.oidcHandler ?? defaultMocks.oidcHandler,
      mocks.issuerConfigFetcher ?? defaultMocks.issuerConfigFetcher,
      mocks.dpopClientKeyManager ?? defaultMocks.dpopClientKeyManager
    );
  }

  it("should call the actual handler when an Oidc Issuer is provided", async () => {
    const actualHandler = defaultMocks.oidcHandler;
    const handler = getInitialisedHandler({ oidcHandler: actualHandler });
    await handler.handle({ oidcIssuer: new URL("https://arbitrary.url") });

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
      handler.canHandle({ oidcIssuer: new URL("https://arbitrary.url") })
    ).resolves.toBe(true);
  });

  it("should indicate it cannot handle logins without an issuer", async () => {
    const handler = getInitialisedHandler();
    // TS Ignore because bad input is purposely given here for the purpose of testing
    // @ts-ignore
    await expect(handler.canHandle({})).resolves.toBe(false);
  });
});
