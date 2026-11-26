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

import { jest, it, describe, expect, afterEach } from "@jest/globals";
import {
  mockStorage,
  GeneralLogoutHandler,
  EVENTS,
} from "@inrupt/solid-client-authn-core";
import type * as SolidClientAuthnCore from "@inrupt/solid-client-authn-core";
import { EventEmitter } from "events";
import { SignJWT, generateKeyPair } from "jose";
import {
  buildLoginHandler,
  buildRedirectHandler,
  getClientAuthenticationWithDependencies,
} from "./dependencies";
import ClientAuthentication from "./ClientAuthentication";
import StorageUtilityNode from "./storage/StorageUtility";
import {
  mockDefaultIssuerConfig,
  mockIssuerConfigFetcher,
} from "./login/oidc/__mocks__/IssuerConfigFetcher";
import { mockDefaultClientRegistrar } from "./login/oidc/__mocks__/ClientRegistrar";
import { SessionInfoManager } from "./sessionInfo/SessionInfoManager";
import { mockDefaultTokenRefresher } from "./login/oidc/refresh/__mocks__/TokenRefresher";
import RefreshTokenOidcHandler from "./login/oidc/oidcHandlers/RefreshTokenOidcHandler";
import ClientCredentialsOidcHandler from "./login/oidc/oidcHandlers/ClientCredentialsOidcHandler";
import AuthorizationCodeWithPkceOidcHandler from "./login/oidc/oidcHandlers/AuthorizationCodeWithPkceOidcHandler";

// Camelcase identifiers are required in the OIDC specification.
/* eslint-disable camelcase*/

jest.mock("@inrupt/solid-client-authn-core", () => {
  const actualCoreModule = jest.requireActual(
    "@inrupt/solid-client-authn-core",
  ) as typeof SolidClientAuthnCore;
  return {
    ...actualCoreModule,
    // This works around the network lookup to the JWKS in order to validate the ID token.
    getWebidFromTokenPayload: jest.fn(() =>
      Promise.resolve("https://my.webid/"),
    ),
  };
});

const mockTokenEndpoint = async () => {
  const issuerConfig = mockDefaultIssuerConfig();
  // openid-client validates the ID token claims, but not its signature (which
  // is validated by getWebidFromTokenPayload, mocked above).
  const { privateKey } = await generateKeyPair("ES256");
  const idToken = await new SignJWT({ webid: "https://my.webid/" })
    .setProtectedHeader({ alg: "ES256" })
    .setSubject("https://my.webid/")
    .setIssuer(issuerConfig.issuer)
    .setAudience("some client ID")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);
  return jest.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    if (new Request(input).url !== issuerConfig.tokenEndpoint) {
      return new Response(null, { status: 404 });
    }
    return new Response(
      JSON.stringify({
        access_token: "some token",
        id_token: idToken,
        token_type: "DPoP",
        expires_in: 3600,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });
};

describe("dependencies.node", () => {
  it("performs dependency injection in a node environment", () => {
    const clientAuthn = getClientAuthenticationWithDependencies({});
    expect(clientAuthn).toBeInstanceOf(ClientAuthentication);
  });
});

describe("resolution order", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mockClientAuthentication = () => {
    const storageUtility = new StorageUtilityNode(
      mockStorage({}),
      mockStorage({}),
    );

    const issuerConfigFetcher = mockIssuerConfigFetcher(
      mockDefaultIssuerConfig(),
    );
    const clientRegistrar = mockDefaultClientRegistrar();

    const sessionInfoManager = new SessionInfoManager(storageUtility);

    const tokenRefresher = mockDefaultTokenRefresher();

    const loginHandler = buildLoginHandler(
      storageUtility,
      tokenRefresher,
      issuerConfigFetcher,
      clientRegistrar,
    );

    const redirectHandler = buildRedirectHandler(
      storageUtility,
      sessionInfoManager,
      issuerConfigFetcher,
      clientRegistrar,
      tokenRefresher,
    );

    return new ClientAuthentication(
      loginHandler,
      redirectHandler,
      new GeneralLogoutHandler(sessionInfoManager),
      sessionInfoManager,
    );
  };

  it("calls the refresh token handler if a refresh token is present", async () => {
    const clientAuthn = mockClientAuthentication();
    const handlerSelectSpy = jest.spyOn(
      // The easiest way to test this is to look into the injected dependencies
      // (which is why we look up private attributes).
      (clientAuthn as any).loginHandler.oidcHandler,
      "getProperHandler",
    );
    const mockTimeout = jest.fn();
    // @ts-expect-error If setTimeout is called within the test
    // then this leaves open handles in jest. Instead we mock it.
    // setTimeout should be called once to start proactive refresh
    globalThis.setTimeout = mockTimeout;
    await clientAuthn.login(
      "someSession",
      {
        clientId: "some client ID",
        clientSecret: "some client secret",
        refreshToken: "some refresh token",
        oidcIssuer: "https://some.issuer",
      },
      new EventEmitter(),
    );
    await expect(
      handlerSelectSpy.mock.results[0].value,
    ).resolves.toBeInstanceOf(RefreshTokenOidcHandler);
    expect(mockTimeout).toHaveBeenCalledTimes(1);
  });

  it("calls the client credentials handler if client credentials are present, but no refresh token is provided", async () => {
    const fetchSpy = await mockTokenEndpoint();
    const clientAuthn = mockClientAuthentication();
    const handlerSelectSpy = jest.spyOn(
      // The easiest way to test this is to look into the injected dependencies
      // (which is why we look up private attributes).
      (clientAuthn as any).loginHandler.oidcHandler,
      "getProperHandler",
    );
    const emitter = new EventEmitter();
    emitter.on(EVENTS.TIMEOUT_SET, (t: NodeJS.Timeout) => {
      // If not cleared the expiry timeout handler leaves an
      // open handle in tests.
      clearTimeout(t);
    });
    await clientAuthn.login(
      "someSession",
      {
        clientId: "some client ID",
        clientSecret: "some client secret",
        oidcIssuer: "https://some.issuer",
      },
      emitter,
    );
    await expect(
      handlerSelectSpy.mock.results[0].value,
    ).resolves.toBeInstanceOf(ClientCredentialsOidcHandler);
    expect(fetchSpy).toHaveBeenCalled();
  });

  it("calls the auth code handler if no client secret is present", async () => {
    const clientAuthn = mockClientAuthentication();
    const handlerSelectSpy = jest.spyOn(
      // The easiest way to test this is to look into the injected dependencies
      // (which is why we look up private attributes).
      (clientAuthn as any).loginHandler.oidcHandler,
      "getProperHandler",
    );
    await clientAuthn.login(
      "someSession",
      {
        clientId: "some client ID",
        oidcIssuer: "https://some.issuer",
        handleRedirect: jest.fn(),
        redirectUrl: "https://example.org/some-redirect-url",
      },
      new EventEmitter(),
    );
    await expect(
      handlerSelectSpy.mock.results[0].value,
    ).resolves.toBeInstanceOf(AuthorizationCodeWithPkceOidcHandler);
  });
});
