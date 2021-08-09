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
import { mockStorage } from "@inrupt/solid-client-authn-core";
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
import GeneralLogoutHandler from "./logout/GeneralLogoutHandler";
import RefreshTokenOidcHandler from "./login/oidc/oidcHandlers/RefreshTokenOidcHandler";
import ClientCredentialsOidcHandler from "./login/oidc/oidcHandlers/ClientCredentialsOidcHandler";
import AuthorizationCodeWithPkceOidcHandler from "./login/oidc/oidcHandlers/AuthorizationCodeWithPkceOidcHandler";

jest.mock("openid-client");
// jest.mock("cross-fetch");
jest.mock("@inrupt/solid-client-authn-core", () => {
  const actualCoreModule = jest.requireActual(
    "@inrupt/solid-client-authn-core"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) as any;
  return {
    ...actualCoreModule,
    // This works around the network lookup to the JWKS in order to validate the ID token.
    getWebidFromTokenPayload: jest.fn(() =>
      Promise.resolve("https://my.webid/")
    ),
  };
});

const setupOidcClientMock = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { Issuer } = jest.requireMock("openid-client") as any;
  function clientConstructor() {
    // this is untyped, which makes TS complain
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.grant = jest.fn().mockResolvedValueOnce({
      access_token: "some token",
      id_token:
        "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJodHRwczovL215LndlYmlkIiwiaXNzIjoiaHR0cHM6Ly9teS5pZHAvIiwiYXVkIjoiaHR0cHM6Ly9yZXNvdXJjZS5leGFtcGxlLm9yZyIsImV4cCI6MTY2MjI2NjIxNiwiaWF0IjoxNDYyMjY2MjE2fQ.IwumuwJtQw5kUBMMHAaDPJBppfBpRHbiXZw_HlKe6GNVUWUlyQRYV7W7r9OQtHmMsi6GVwOckelA3ErmhrTGVw",
      token_type: "Bearer",
      expired: () => false,
      claims: jest.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.authorizationUrl = jest
      .fn()
      .mockReturnValue("https://some.issuer/uri_parameters_go_there/");
  }
  const mockedIssuer = {
    metadata: mockDefaultIssuerConfig(),
    Client: clientConstructor,
  };
  Issuer.mockReturnValueOnce(mockedIssuer);
};

describe("dependencies.node", () => {
  it("performs dependency injection in a node environment", () => {
    const clientAuthn = getClientAuthenticationWithDependencies({});
    expect(clientAuthn).toBeInstanceOf(ClientAuthentication);
  });
});

describe("resolution order", () => {
  const mockClientAuthentication = () => {
    const storageUtility = new StorageUtilityNode(
      mockStorage({}),
      mockStorage({})
    );

    const issuerConfigFetcher = mockIssuerConfigFetcher(
      mockDefaultIssuerConfig()
    );
    const clientRegistrar = mockDefaultClientRegistrar();

    const sessionInfoManager = new SessionInfoManager(storageUtility);

    const tokenRefresher = mockDefaultTokenRefresher();

    const loginHandler = buildLoginHandler(
      storageUtility,
      tokenRefresher,
      issuerConfigFetcher,
      clientRegistrar
    );

    const redirectHandler = buildRedirectHandler(
      storageUtility,
      sessionInfoManager,
      issuerConfigFetcher,
      clientRegistrar,
      tokenRefresher
    );

    return new ClientAuthentication(
      loginHandler,
      redirectHandler,
      new GeneralLogoutHandler(sessionInfoManager),
      sessionInfoManager
    );
  };

  it("calls the refresh token handler if a refresh token is present", async () => {
    const clientAuthn = mockClientAuthentication();
    const handlerSelectSpy = jest.spyOn(
      // The easiest way to test this is to look into the injected dependencies
      // (which is why we look up private attributes).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (clientAuthn as any).loginHandler.oidcHandler,
      "getProperHandler"
    );
    await clientAuthn.login("someSession", {
      clientId: "some client ID",
      clientSecret: "some client secret",
      refreshToken: "some refresh token",
      oidcIssuer: "https://some.issuer",
    });
    await expect(
      handlerSelectSpy.mock.results[0].value
    ).resolves.toBeInstanceOf(RefreshTokenOidcHandler);
  });

  it("calls the client credentials handler if client credentials are present, but no refresh token is provided", async () => {
    setupOidcClientMock();
    const clientAuthn = mockClientAuthentication();
    const handlerSelectSpy = jest.spyOn(
      // The easiest way to test this is to look into the injected dependencies
      // (which is why we look up private attributes).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (clientAuthn as any).loginHandler.oidcHandler,
      "getProperHandler"
    );
    await clientAuthn.login("someSession", {
      clientId: "some client ID",
      clientSecret: "some client secret",
      oidcIssuer: "https://some.issuer",
    });
    await expect(
      handlerSelectSpy.mock.results[0].value
    ).resolves.toBeInstanceOf(ClientCredentialsOidcHandler);
  });

  it("calls the auth code handler if no client secret is present", async () => {
    setupOidcClientMock();
    const clientAuthn = mockClientAuthentication();
    const handlerSelectSpy = jest.spyOn(
      // The easiest way to test this is to look into the injected dependencies
      // (which is why we look up private attributes).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (clientAuthn as any).loginHandler.oidcHandler,
      "getProperHandler"
    );
    await clientAuthn.login("someSession", {
      clientId: "some client ID",
      oidcIssuer: "https://some.issuer",
      handleRedirect: jest.fn(),
    });
    await expect(
      handlerSelectSpy.mock.results[0].value
    ).resolves.toBeInstanceOf(AuthorizationCodeWithPkceOidcHandler);
  });
});
