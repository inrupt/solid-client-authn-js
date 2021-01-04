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

import "reflect-metadata";
import {
  mockStorageUtility,
  StorageUtilityMock,
} from "@inrupt/solid-client-authn-core";
import { JWK } from "jose";
import { IdTokenClaims, TokenSet } from "openid-client";
import TokenRefresher from "./TokenRefresher";
import { mockDefaultClientRegistrar } from "../__mocks__/ClientRegistrar";
import {
  mockDefaultIssuerConfig,
  mockIssuerConfigFetcher,
} from "../__mocks__/IssuerConfigFetcher";

jest.mock("openid-client");

const mockJwk = (): JWK.ECKey =>
  JWK.asKey({
    kty: "EC",
    kid: "oOArcXxcwvsaG21jAx_D5CHr4BgVCzCEtlfmNFQtU0s",
    alg: "ES256",
    crv: "P-256",
    x: "0dGe_s-urLhD3mpqYqmSXrqUZApVV5ZNxMJXg7Vp-2A",
    y: "-oMe9gGkpfIrnJ0aiSUHMdjqYVm5ZrGCeQmRKoIIfj8",
    d: "yR1bCsR7m4hjFCvWo8Jw3OfNR4aiYDAFbBD9nkudJKM",
  });

const mockIdToken = (): string =>
  "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJodHRwczovL215LndlYmlkIiwiaXNzIjoiaHR0cHM6Ly9teS5pZHAvIiwiYXVkIjoiaHR0cHM6Ly9yZXNvdXJjZS5leGFtcGxlLm9yZyIsImV4cCI6MTY2MjI2NjIxNiwiaWF0IjoxNDYyMjY2MjE2fQ.IwumuwJtQw5kUBMMHAaDPJBppfBpRHbiXZw_HlKe6GNVUWUlyQRYV7W7r9OQtHmMsi6GVwOckelA3ErmhrTGVw";

type AccessJwt = {
  sub: string;
  iss: string;
  aud: string;
  nbf: number;
  exp: number;
  cnf: {
    jkt: string;
  };
};

const mockWebId = (): string => "https://my.webid/";

const mockKeyBoundToken = (): AccessJwt => {
  return {
    sub: mockWebId(),
    iss: mockDefaultIssuerConfig().issuer.toString(),
    aud: "https://resource.example.org",
    nbf: 1562262611,
    exp: 1562266216,
    cnf: {
      jkt: mockJwk().kid as string,
    },
  };
};

const mockIdTokenPayload = (): IdTokenClaims => {
  return {
    sub: "https://my.webid",
    iss: "https://my.idp/",
    aud: "https://resource.example.org",
    exp: 1662266216,
    iat: 1462266216,
  };
};

const mockDpopTokens = (): TokenSet => {
  return {
    access_token: JSON.stringify(mockKeyBoundToken()),
    id_token: mockIdToken(),
    token_type: "DPoP",
    expired: () => false,
    claims: mockIdTokenPayload,
  };
};

const setupOidcClientMock = (tokenSet: TokenSet) => {
  const { Issuer } = jest.requireMock("openid-client");
  function clientConstructor() {
    // this is untyped, which makes TS complain
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.refresh = jest.fn().mockResolvedValueOnce(tokenSet);
  }
  const mockedIssuer = {
    metadata: mockDefaultIssuerConfig(),
    Client: clientConstructor,
  };
  Issuer.mockReturnValueOnce(mockedIssuer);
};

const setupDefaultOidcClientMock = () => {
  setupOidcClientMock(mockDpopTokens());
};

const mockRefresherDefaultStorageUtility = () =>
  mockStorageUtility({
    "solidClientAuthenticationUser:mySession": {
      issuer: "https://my.idp",
      codeVerifier: "some code verifier",
      redirectUri: "https://my.app/redirect",
      dpop: "true",
    },
  });

describe("TokenRefresher", () => {
  const defaultMocks = {
    storageUtility: StorageUtilityMock,
    issuerConfigFetcher: mockIssuerConfigFetcher(mockDefaultIssuerConfig()),
    clientRegistrar: mockDefaultClientRegistrar(),
  };

  function getTokenRefresher(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): TokenRefresher {
    return new TokenRefresher(
      mocks.storageUtility ?? defaultMocks.storageUtility,
      mocks.issuerConfigFetcher ?? defaultMocks.issuerConfigFetcher,
      mocks.clientRegistrar ?? defaultMocks.clientRegistrar
    );
  }

  it("throws if no OIDC issuer can be retrieved from storage", async () => {
    const mockedStorage = mockStorageUtility({
      "solidClientAuthenticationUser:mySession": {
        codeVerifier: "some code verifier",
        redirectUri: "https://my.app/redirect",
        dpop: "true",
      },
    });

    const refresher = getTokenRefresher({
      storageUtility: mockedStorage,
    });

    await expect(
      refresher.refresh("mySession", "some refresh token")
    ).rejects.toThrow(
      "Failed to retrieve OIDC context from storage associated with session [mySession]"
    );
  });

  it("throws if the token type cannot be retrieved from storage", async () => {
    const mockedStorage = mockStorageUtility({
      "solidClientAuthenticationUser:mySession": {
        issuer: "https://my.idp",
      },
    });

    const refresher = getTokenRefresher({
      storageUtility: mockedStorage,
    });

    await expect(
      refresher.refresh("mySession", "some refresh token")
    ).rejects.toThrow(
      "Failed to retrieve OIDC context from storage associated with session [mySession]"
    );
  });

  it("throws if a refresh token isn't provided", async () => {
    setupDefaultOidcClientMock();
    const mockedStorage = mockRefresherDefaultStorageUtility();

    const refresher = getTokenRefresher({
      storageUtility: mockedStorage,
    });

    await expect(refresher.refresh("mySession")).rejects.toThrow(
      "Session [mySession] has no refresh token to allow it to refresh its access token."
    );
  });

  it("throws if a DPoP token is expected, but no DPoP key is provided", async () => {
    setupDefaultOidcClientMock();
    const mockedStorage = mockRefresherDefaultStorageUtility();

    const refresher = getTokenRefresher({
      storageUtility: mockedStorage,
    });

    await expect(
      refresher.refresh("mySession", "some refresh token")
    ).rejects.toThrow(
      "For session [mySession], the key bound to the DPoP access token must be provided to refresh said access token."
    );
  });

  it("refreshes a DPoP token properly", async () => {
    setupDefaultOidcClientMock();
    const mockedStorage = mockRefresherDefaultStorageUtility();

    const refresher = getTokenRefresher({
      storageUtility: mockedStorage,
    });

    const refreshedTokens = await refresher.refresh(
      "mySession",
      "some refresh token",
      mockJwk()
    );

    expect(refreshedTokens.access_token).toEqual(mockDpopTokens().access_token);
  });

  it("refreshes a bearer token properly", async () => {
    setupDefaultOidcClientMock();
    const mockedStorage = mockStorageUtility({
      "solidClientAuthenticationUser:mySession": {
        issuer: "https://my.idp",
        codeVerifier: "some code verifier",
        redirectUri: "https://my.app/redirect",
        dpop: "false",
      },
    });

    const refresher = getTokenRefresher({
      storageUtility: mockedStorage,
    });

    const refreshedTokens = await refresher.refresh(
      "mySession",
      "some refresh token"
    );

    expect(refreshedTokens.access_token).toEqual(mockDpopTokens().access_token);
  });

  it("stores the refresh token if one is returned", async () => {
    const mockedTokens = mockDpopTokens();
    mockedTokens.refresh_token = "some new refresh token";
    setupOidcClientMock(mockedTokens);

    const mockedStorage = mockRefresherDefaultStorageUtility();

    const refresher = getTokenRefresher({
      storageUtility: mockedStorage,
    });

    const refreshedTokens = await refresher.refresh(
      "mySession",
      "some old refresh token",
      mockJwk()
    );
    expect(refreshedTokens.refresh_token).toEqual("some new refresh token");

    // Check that the session information is stored in the provided storage
    await expect(
      mockedStorage.getForUser("mySession", "refreshToken")
    ).resolves.toEqual("some new refresh token");
  });

  it("throws if the IdP does not return an access token", async () => {
    const mockedTokens = mockDpopTokens();
    mockedTokens.access_token = undefined;
    setupOidcClientMock(mockedTokens);

    const mockedStorage = mockRefresherDefaultStorageUtility();

    const refresher = getTokenRefresher({
      storageUtility: mockedStorage,
    });

    await expect(
      refresher.refresh("mySession", "some old refresh token", mockJwk())
    ).rejects.toThrow(
      `The Identity Provider [${
        mockDefaultIssuerConfig().issuer
      }] did not return an access token on refresh`
    );
  });
});
