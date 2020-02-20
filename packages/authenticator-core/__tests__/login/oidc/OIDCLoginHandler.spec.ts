// Required by TSyringe:
import "reflect-metadata";
import OIDCLoginHandler from "../../../src/login/oidc/OIDCLoginHandler";
import IOIDCHandler from "../../../src/login/oidc/IOIDCHandler";
import URL from "url-parse";
import { IIssuerConfigFetcher } from "../../../src/login/oidc/IssuerConfigFetcher";
import { IDPoPClientKeyManager } from "../../../src/util/dpop/DPoPClientKeyManager";

/* eslint-disable @typescript-eslint/ban-ts-ignore */

describe("OIDCLoginHandler", () => {
  const defaultMocks = {
    oidcHandler: { handle: jest.fn(() => Promise.resolve()) },
    issuerConfigFetcher: {
      fetchConfig: jest.fn(() => Promise.resolve({ arbitrary: "config" }))
    },
    dPoPClientKeyManager: {
      generateClientKeyIfNotAlready: jest.fn(() => Promise.resolve())
    }
  };
  function getInitialisedHandler(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): OIDCLoginHandler {
    return new OIDCLoginHandler(
      (mocks.oidcHandler ??
        (defaultMocks.oidcHandler as unknown)) as IOIDCHandler,
      (mocks.issuerConfigFetcher ??
        (defaultMocks.issuerConfigFetcher as unknown)) as IIssuerConfigFetcher,
      (mocks.dPoPClientKeyManager ??
        (defaultMocks.dPoPClientKeyManager as unknown)) as IDPoPClientKeyManager
    );
  }

  it("should call the actual handler when an OIDC Issuer is provided", async () => {
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
      "OIDCLoginHandler requires an oidcIssuer"
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
