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
import type * as SolidClientAuthnCore from "@inrupt/solid-client-authn-core";
import {
  mockStorageUtility,
  StorageUtilityMock,
  EVENTS,
} from "@inrupt/solid-client-authn-core";
import type { JWK, CryptoKey } from "jose";
import { importJWK } from "jose";
import { EventEmitter } from "events";
import TokenRefresher from "./TokenRefresher";
import {
  mockClientRegistrar,
  mockDefaultClientRegistrar,
} from "../__mocks__/ClientRegistrar";
import {
  mockDefaultIssuerConfig,
  mockIssuerConfigFetcher,
} from "../__mocks__/IssuerConfigFetcher";
import { negotiateClientSigningAlg } from "../ClientRegistrar";

// Camelcase identifiers are required in the OIDC specification.
/* eslint-disable camelcase*/

// ---------------------------------------------------------------------------
// MIGRATION (Phase 4): refresh now uses oauth4webapi
// (`refreshTokenGrantRequest` + `processRefreshTokenResponse`) instead of
// openid-client `client.refresh`. We mock those two functions. Note
// oauth4webapi normalises `token_type` to lowercase ("dpop"/"bearer").
//
// NOTE (CI-validate): not executed in this branch (deps not installed).
// ---------------------------------------------------------------------------
jest.mock("oauth4webapi", () => {
  const actual = jest.requireActual("oauth4webapi") as any;
  return {
    ...actual,
    refreshTokenGrantRequest: jest.fn(() => Promise.resolve(new Response())),
    processRefreshTokenResponse: jest.fn(),
    DPoP: jest.fn(() => ({})),
    isDPoPNonceError: jest.fn(() => false),
  };
});
jest.mock("../ClientRegistrar");

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

// eslint-disable-next-line import/first
import * as oauth from "oauth4webapi";

const mockJwk = (): JWK => {
  return {
    kty: "EC",
    kid: "oOArcXxcwvsaG21jAx_D5CHr4BgVCzCEtlfmNFQtU0s",
    alg: "ES256",
    crv: "P-256",
    x: "0dGe_s-urLhD3mpqYqmSXrqUZApVV5ZNxMJXg7Vp-2A",
    y: "-oMe9gGkpfIrnJ0aiSUHMdjqYVm5ZrGCeQmRKoIIfj8",
    d: "yR1bCsR7m4hjFCvWo8Jw3OfNR4aiYDAFbBD9nkudJKM",
  };
};

const mockKeyPair = async (): Promise<SolidClientAuthnCore.KeyPair> => {
  return {
    privateKey: (await importJWK(mockJwk())) as CryptoKey,
    // Use the same JWK for public and private key out of convenience, don't do
    // this in real life.
    publicKey: mockJwk(),
  };
};

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

// A processed refresh-token response, as returned by
// `oauth.processRefreshTokenResponse` (token_type normalised to lowercase).
type ProcessedTokens = {
  access_token?: string;
  id_token?: string;
  token_type: string;
  refresh_token?: string;
  expires_in?: number;
};

const mockDpopTokens = (): ProcessedTokens => {
  return {
    access_token: JSON.stringify(mockKeyBoundToken()),
    id_token: mockIdToken(),
    token_type: "dpop",
  };
};

const setupOidcClientMock = (tokenSet: ProcessedTokens) => {
  const grantRequest = oauth.refreshTokenGrantRequest as jest.Mock<any>;
  const process = oauth.processRefreshTokenResponse as jest.Mock<any>;
  grantRequest.mockResolvedValueOnce(new Response());
  process.mockResolvedValueOnce(tokenSet);
  // Returned object preserves a `.Client` jest.fn for the legacy
  // "instantiates the client" assertion, which is now an it.todo (no openid
  // client object exists in oauth4webapi).
  return { Client: jest.fn() };
};

const setupDefaultOidcClientMock = () => setupOidcClientMock(mockDpopTokens());

const mockDefaultStorageContent = {
  "solidClientAuthenticationUser:mySession": {
    issuer: "https://my.idp",
    codeVerifier: "some code verifier",
    redirectUrl: "https://my.app/redirect",
    idTokenSignedResponseAlg: "ES256",
    dpop: "true",
  },
};

const mockRefresherDefaultStorageUtility = () =>
  mockStorageUtility(mockDefaultStorageContent);

describe("TokenRefresher", () => {
  const defaultMocks = {
    storageUtility: StorageUtilityMock,
    issuerConfigFetcher: mockIssuerConfigFetcher(mockDefaultIssuerConfig()),
    clientRegistrar: mockDefaultClientRegistrar(),
  };

  function getTokenRefresher(
    mocks: Partial<typeof defaultMocks> = defaultMocks,
  ): TokenRefresher {
    return new TokenRefresher(
      mocks.storageUtility ?? defaultMocks.storageUtility,
      mocks.issuerConfigFetcher ?? defaultMocks.issuerConfigFetcher,
      mocks.clientRegistrar ?? defaultMocks.clientRegistrar,
    );
  }

  it("throws if no OIDC issuer can be retrieved from storage", async () => {
    const mockedStorage = mockStorageUtility({
      "solidClientAuthenticationUser:mySession": {
        codeVerifier: "some code verifier",
        redirectUrl: "https://my.app/redirect",
        dpop: "true",
      },
    });

    const refresher = getTokenRefresher({
      storageUtility: mockedStorage,
    });

    await expect(
      refresher.refresh("mySession", "some refresh token"),
    ).rejects.toThrow(
      "Failed to retrieve OIDC context from storage associated with session [mySession]",
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
      refresher.refresh("mySession", "some refresh token"),
    ).rejects.toThrow(
      "Failed to retrieve OIDC context from storage associated with session [mySession]",
    );
  });

  it("throws if a refresh token isn't provided", async () => {
    setupDefaultOidcClientMock();
    const mockedModule = jest.requireMock("../ClientRegistrar") as {
      negotiateClientSigningAlg: typeof negotiateClientSigningAlg;
    };
    mockedModule.negotiateClientSigningAlg = jest
      .fn(negotiateClientSigningAlg)
      .mockReturnValue("ES256");

    const mockedStorage = mockRefresherDefaultStorageUtility();

    const refresher = getTokenRefresher({
      storageUtility: mockedStorage,
    });

    await expect(refresher.refresh("mySession")).rejects.toThrow(
      "Session [mySession] has no refresh token to allow it to refresh its access token.",
    );
  });

  it("throws if a DPoP token is expected, but no DPoP key is provided", async () => {
    setupDefaultOidcClientMock();
    const mockedModule = jest.requireMock("../ClientRegistrar") as {
      negotiateClientSigningAlg: typeof negotiateClientSigningAlg;
    };
    mockedModule.negotiateClientSigningAlg = jest
      .fn(negotiateClientSigningAlg)
      .mockReturnValue("ES256");
    const mockedStorage = mockRefresherDefaultStorageUtility();

    const refresher = getTokenRefresher({
      storageUtility: mockedStorage,
    });

    await expect(
      refresher.refresh("mySession", "some refresh token"),
    ).rejects.toThrow(
      "For session [mySession], the key bound to the DPoP access token must be provided to refresh said access token.",
    );
  });

  it("does not negotiate the signing algorithm if it is already set for the client", async () => {
    setupDefaultOidcClientMock();
    const mockedModule = jest.requireMock("../ClientRegistrar") as {
      negotiateClientSigningAlg: typeof negotiateClientSigningAlg;
    };
    mockedModule.negotiateClientSigningAlg =
      jest.fn<typeof mockedModule.negotiateClientSigningAlg>();
    const refresher = getTokenRefresher({
      storageUtility: mockRefresherDefaultStorageUtility(),
      clientRegistrar: mockClientRegistrar({
        clientId: "some client ID",
        clientSecret: "some client secret",
        idTokenSignedResponseAlg: "ES256",
        clientType: "static",
      }),
    });

    await refresher.refresh(
      "mySession",
      "some refresh token",
      await mockKeyPair(),
    );

    expect(mockedModule.negotiateClientSigningAlg).not.toHaveBeenCalled();
  });

  it("uses 'none' authentication if using Solid-OIDC client identifiers", async () => {
    setupDefaultOidcClientMock();
    const refresher = getTokenRefresher({
      clientRegistrar: mockClientRegistrar({
        clientId: "https://some.client.identifier",
        clientType: "solid-oidc",
        idTokenSignedResponseAlg: "ES256",
      }),
    });

    await refresher.refresh(
      "mySession",
      "some refresh token",
      await mockKeyPair(),
    );

    // MIGRATION (Phase 4): there is no openid-client `Client` object; the
    // public client (no secret) maps to `token_endpoint_auth_method: "none"` on
    // the oauth4webapi Client passed to `refreshTokenGrantRequest`.
    expect(oauth.refreshTokenGrantRequest).toHaveBeenCalledWith(
      expect.anything(), // AuthorizationServer
      expect.objectContaining({ token_endpoint_auth_method: "none" }),
      expect.anything(), // ClientAuth (oauth.None())
      "some refresh token",
      expect.anything(), // { DPoP? }
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
      await mockKeyPair(),
    );

    expect(refreshedTokens.accessToken).toEqual(mockDpopTokens().access_token);
  });

  it("refreshes a bearer token properly", async () => {
    setupDefaultOidcClientMock();
    const mockedStorage = mockStorageUtility({
      "solidClientAuthenticationUser:mySession": {
        issuer: "https://my.idp",
        codeVerifier: "some code verifier",
        redirectUrl: "https://my.app/redirect",
        dpop: "false",
      },
    });

    const refresher = getTokenRefresher({
      storageUtility: mockedStorage,
    });

    const refreshedTokens = await refresher.refresh(
      "mySession",
      "some refresh token",
    );

    expect(refreshedTokens.accessToken).toEqual(mockDpopTokens().access_token);
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
      await mockKeyPair(),
    );
    expect(refreshedTokens.refreshToken).toBe("some new refresh token");

    // Check that the session information is stored in the provided storage
    await expect(
      mockedStorage.getForUser("mySession", "refreshToken"),
    ).resolves.toBe("some new refresh token");
  });

  it("calls the refresh token rotation handler if one is provided", async () => {
    const mockedTokens = mockDpopTokens();
    mockedTokens.refresh_token = "some new refresh token";
    setupOidcClientMock(mockedTokens);
    const mockedStorage = mockRefresherDefaultStorageUtility();
    const mockEmitter = new EventEmitter();
    const mockEmit = jest.spyOn(mockEmitter, "emit");

    const refresher = getTokenRefresher({
      storageUtility: mockedStorage,
    });

    const refreshedTokens = await refresher.refresh(
      "mySession",
      "some old refresh token",
      await mockKeyPair(),
      mockEmitter,
    );

    expect(refreshedTokens.refreshToken).toBe("some new refresh token");
    expect(mockEmit).toHaveBeenCalledWith(
      EVENTS.NEW_REFRESH_TOKEN,
      "some new refresh token",
    );
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
      refresher.refresh(
        "mySession",
        "some old refresh token",
        await mockKeyPair(),
      ),
    ).rejects.toThrow(
      `The Identity Provider [${
        mockDefaultIssuerConfig().issuer
      }] did not return the expected tokens on refresh: missing at least one of 'access_token', 'id_token'.`,
    );
  });

  it("throws if the IdP does not return an id token", async () => {
    const mockedTokens = mockDpopTokens();
    mockedTokens.id_token = undefined;
    setupOidcClientMock(mockedTokens);

    const mockedStorage = mockRefresherDefaultStorageUtility();

    const refresher = getTokenRefresher({
      storageUtility: mockedStorage,
    });

    await expect(
      refresher.refresh(
        "mySession",
        "some old refresh token",
        await mockKeyPair(),
      ),
    ).rejects.toThrow(
      `The Identity Provider [${
        mockDefaultIssuerConfig().issuer
      }] did not return the expected tokens on refresh: missing at least one of 'access_token', 'id_token'.`,
    );
  });

  it("throws if the IdP returns an unknown token type", async () => {
    const mockedTokens = mockDpopTokens();
    mockedTokens.token_type = "Some unknown token type";
    setupOidcClientMock(mockedTokens);

    const mockedStorage = mockRefresherDefaultStorageUtility();

    const refresher = getTokenRefresher({
      storageUtility: mockedStorage,
    });

    await expect(
      refresher.refresh(
        "mySession",
        "some old refresh token",
        await mockKeyPair(),
      ),
    ).rejects.toThrow(
      `The Identity Provider [${
        mockDefaultIssuerConfig().issuer
      }] returned an unknown token type: [Some unknown token type]`,
    );
  });
});
