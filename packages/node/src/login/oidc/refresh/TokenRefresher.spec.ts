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

import {
  jest,
  it,
  describe,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
} from "@jest/globals";
import type * as SolidClientAuthnCore from "@inrupt/solid-client-authn-core";
import {
  mockStorageUtility,
  StorageUtilityMock,
  EVENTS,
  generateDpopKeyPair,
} from "@inrupt/solid-client-authn-core";
import type { CryptoKey } from "jose";
import {
  decodeJwt,
  decodeProtectedHeader,
  generateKeyPair,
  SignJWT,
} from "jose";
import type * as OpenidClient from "openid-client";
import { EventEmitter } from "events";
import TokenRefresher from "./TokenRefresher";
import {
  mockClientRegistrar,
  mockDefaultClient,
  mockDefaultClientRegistrar,
} from "../__mocks__/ClientRegistrar";
import {
  mockDefaultIssuerConfig,
  mockIssuerConfig,
  mockIssuerConfigFetcher,
} from "../__mocks__/IssuerConfigFetcher";
import type * as ClientRegistrarModule from "../ClientRegistrar";

// Camelcase identifiers are required in the OIDC specification.
/* eslint-disable camelcase*/

// openid-client is used for real, the network is mocked instead. The token
// grant is only wrapped in a spy so that responses which openid-client would
// reject can be fed to the refresher.
jest.mock("openid-client", () => {
  const actual = jest.requireActual("openid-client") as typeof OpenidClient;
  return {
    ...actual,
    refreshTokenGrant: jest.fn(actual.refreshTokenGrant),
  };
});

jest.mock("../ClientRegistrar", () => {
  const actual = jest.requireActual(
    "../ClientRegistrar",
  ) as typeof ClientRegistrarModule;
  return {
    ...actual,
    negotiateClientSigningAlg: jest.fn(actual.negotiateClientSigningAlg),
  };
});

jest.mock("@inrupt/solid-client-authn-core", () => {
  const actualCoreModule = jest.requireActual(
    "@inrupt/solid-client-authn-core",
  ) as typeof SolidClientAuthnCore;
  return {
    ...actualCoreModule,
    // This works around the network lookup to the JWKS in order to validate the ID token.
    getWebidFromTokenPayload: jest.fn(() =>
      Promise.resolve({ webId: "https://my.webid/" }),
    ),
  };
});

const mockWebId = (): string => "https://my.webid/";

let idTokenSigningKey: CryptoKey;

beforeAll(async () => {
  // The ID token signature isn't verified by openid-client, and the
  // verification done by the library is mocked, so any key works.
  ({ privateKey: idTokenSigningKey } = await generateKeyPair("ES256"));
});

// Builds an ID token which passes the claims validation done by openid-client.
const mockIdToken = async (
  options: { clientId?: string; issuer?: string; alg?: string } = {},
): Promise<string> =>
  new SignJWT({})
    .setProtectedHeader({ alg: options.alg ?? "ES256" })
    .setSubject(mockWebId())
    .setIssuer(options.issuer ?? mockDefaultIssuerConfig().issuer)
    .setAudience(options.clientId ?? mockDefaultClient().clientId)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(idTokenSigningKey);

type TokenEndpointBody = {
  access_token?: string;
  id_token?: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
};

const mockTokenEndpointBody = async (
  overrides: TokenEndpointBody = {},
): Promise<TokenEndpointBody> => ({
  access_token: "some refreshed access token",
  id_token: await mockIdToken(),
  token_type: "DPoP",
  expires_in: 3600,
  ...overrides,
});

const mockTokenEndpointResponse = (body: TokenEndpointBody) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

const mockedFetch = jest.spyOn(globalThis, "fetch");

const mockTokenEndpoint = async (overrides: TokenEndpointBody = {}) => {
  const body = await mockTokenEndpointBody(overrides);
  mockedFetch.mockResolvedValueOnce(mockTokenEndpointResponse(body));
  return body;
};

// Returns the request sent to the token endpoint.
const getTokenRequest = () => {
  expect(mockedFetch).toHaveBeenCalledTimes(1);
  const [url, init] = mockedFetch.mock.calls[0];
  return {
    url: url.toString(),
    method: init?.method,
    headers: new Headers(init?.headers),
    body: new URLSearchParams(init?.body as string | URLSearchParams),
  };
};

// openid-client wraps the underlying oauth4webapi errors in a generic error.
const openidClientError = (message: string, causeMessage: string) =>
  expect.objectContaining({
    message,
    cause: expect.objectContaining({ message: causeMessage }),
  });

const getMockedGrant = () =>
  (jest.requireMock("openid-client") as jest.Mocked<typeof OpenidClient>)
    .refreshTokenGrant;

const getMockedNegotiation = () =>
  (
    jest.requireMock("../ClientRegistrar") as jest.Mocked<
      typeof ClientRegistrarModule
    >
  ).negotiateClientSigningAlg;

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

const mockBearerStorageUtility = () =>
  mockStorageUtility({
    "solidClientAuthenticationUser:mySession": {
      issuer: "https://my.idp",
      codeVerifier: "some code verifier",
      redirectUrl: "https://my.app/redirect",
      dpop: "false",
    },
  });

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

  beforeEach(() => {
    // Prevent any accidental network call.
    mockedFetch.mockRejectedValue(new Error("Unexpected network call"));
  });

  afterEach(() => {
    mockedFetch.mockReset();
  });

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
    const refresher = getTokenRefresher({
      storageUtility: mockRefresherDefaultStorageUtility(),
    });

    await expect(refresher.refresh("mySession")).rejects.toThrow(
      "Session [mySession] has no refresh token to allow it to refresh its access token.",
    );
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("throws if a DPoP token is expected, but no DPoP key is provided", async () => {
    const refresher = getTokenRefresher({
      storageUtility: mockRefresherDefaultStorageUtility(),
    });

    await expect(
      refresher.refresh("mySession", "some refresh token"),
    ).rejects.toThrow(
      "For session [mySession], the key bound to the DPoP access token must be provided to refresh said access token.",
    );
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("negotiates the signing algorithm if it is not set for the client", async () => {
    // The issuer supports ES256 and RS256, and ES256 is preferred.
    await mockTokenEndpoint();
    const refresher = getTokenRefresher({
      storageUtility: mockRefresherDefaultStorageUtility(),
    });

    await expect(
      refresher.refresh(
        "mySession",
        "some refresh token",
        await generateDpopKeyPair(),
      ),
    ).resolves.toBeDefined();

    expect(getMockedNegotiation()).toHaveBeenCalledTimes(1);
  });

  it("does not negotiate the signing algorithm if it is already set for the client", async () => {
    await mockTokenEndpoint({
      id_token: await mockIdToken({ clientId: "some client ID" }),
    });
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
      await generateDpopKeyPair(),
    );

    expect(getMockedNegotiation()).not.toHaveBeenCalled();
  });

  it("expects the ID token to be signed with the client's signing algorithm", async () => {
    // The ID token is signed using ES256, but the client expects RS256.
    await mockTokenEndpoint({
      id_token: await mockIdToken({ clientId: "some client ID" }),
    });
    const refresher = getTokenRefresher({
      storageUtility: mockRefresherDefaultStorageUtility(),
      clientRegistrar: mockClientRegistrar({
        clientId: "some client ID",
        clientSecret: "some client secret",
        idTokenSignedResponseAlg: "RS256",
        clientType: "static",
      }),
    });

    await expect(
      refresher.refresh(
        "mySession",
        "some refresh token",
        await generateDpopKeyPair(),
      ),
    ).rejects.toEqual(
      openidClientError(
        "invalid response encountered",
        'unexpected JWT "alg" header parameter',
      ),
    );
  });

  it("uses 'none' authentication if using Solid-OIDC client identifiers", async () => {
    await mockTokenEndpoint({
      id_token: await mockIdToken({
        clientId: "https://some.client.identifier",
      }),
    });
    const refresher = getTokenRefresher({
      storageUtility: mockRefresherDefaultStorageUtility(),
      clientRegistrar: mockClientRegistrar({
        clientId: "https://some.client.identifier",
        clientType: "solid-oidc",
        idTokenSignedResponseAlg: "ES256",
      }),
    });

    await refresher.refresh(
      "mySession",
      "some refresh token",
      await generateDpopKeyPair(),
    );

    const request = getTokenRequest();
    expect(request.headers.has("Authorization")).toBe(false);
    expect(request.body.get("client_id")).toBe(
      "https://some.client.identifier",
    );
    expect(request.body.has("client_secret")).toBe(false);
  });

  it("uses 'client_secret_basic' authentication if the client has a secret", async () => {
    await mockTokenEndpoint();
    const refresher = getTokenRefresher({
      storageUtility: mockRefresherDefaultStorageUtility(),
    });

    await refresher.refresh(
      "mySession",
      "some refresh token",
      await generateDpopKeyPair(),
    );

    const request = getTokenRequest();
    // The client ID and secret are form-URL-encoded, so spaces become '+'.
    expect(request.headers.get("Authorization")).toBe(
      `Basic ${btoa("a+client+id:a+client+secret")}`,
    );
    expect(request.body.has("client_secret")).toBe(false);
  });

  it("refreshes a DPoP token properly", async () => {
    const tokenResponse = await mockTokenEndpoint();
    const dpopKey = await generateDpopKeyPair();
    const refresher = getTokenRefresher({
      storageUtility: mockRefresherDefaultStorageUtility(),
    });

    const refreshedTokens = await refresher.refresh(
      "mySession",
      "some refresh token",
      dpopKey,
    );

    expect(refreshedTokens.accessToken).toBe(tokenResponse.access_token);
    expect(refreshedTokens.idToken).toBe(tokenResponse.id_token);
    expect(refreshedTokens.tokenType).toBe("DPoP");
    expect(refreshedTokens.webId).toBe(mockWebId());
    expect(refreshedTokens.refreshToken).toBeUndefined();

    const request = getTokenRequest();
    expect(request.url).toBe(mockDefaultIssuerConfig().tokenEndpoint);
    expect(request.method).toBe("POST");
    expect(request.body.get("grant_type")).toBe("refresh_token");
    expect(request.body.get("refresh_token")).toBe("some refresh token");
    // The token request is DPoP-bound to the provided key.
    const dpopProof = request.headers.get("DPoP");
    expect(dpopProof).not.toBeNull();
    const proofHeader = decodeProtectedHeader(dpopProof as string);
    expect(proofHeader.typ).toBe("dpop+jwt");
    expect(proofHeader.jwk).toMatchObject({
      kty: dpopKey.publicKey.kty,
      x: dpopKey.publicKey.x,
      y: dpopKey.publicKey.y,
    });
    expect(decodeJwt(dpopProof as string)).toMatchObject({
      htm: "POST",
      htu: mockDefaultIssuerConfig().tokenEndpoint,
    });
  });

  it("refreshes a bearer token properly", async () => {
    const tokenResponse = await mockTokenEndpoint({ token_type: "Bearer" });
    const refresher = getTokenRefresher({
      storageUtility: mockBearerStorageUtility(),
    });

    const refreshedTokens = await refresher.refresh(
      "mySession",
      "some refresh token",
    );

    expect(refreshedTokens.accessToken).toBe(tokenResponse.access_token);
    expect(refreshedTokens.tokenType).toBe("Bearer");
    const request = getTokenRequest();
    expect(request.body.get("grant_type")).toBe("refresh_token");
    expect(request.body.get("refresh_token")).toBe("some refresh token");
    expect(request.headers.has("DPoP")).toBe(false);
  });

  it.each([
    ["Bearer", "Bearer"],
    ["bearer", "Bearer"],
    ["BEARER", "Bearer"],
    ["DPoP", "DPoP"],
    ["dpop", "DPoP"],
    ["DPOP", "DPoP"],
  ])(
    "maps the token type [%s] returned by the IdP to [%s]",
    async (returnedType, expectedType) => {
      await mockTokenEndpoint({ token_type: returnedType });
      const refresher = getTokenRefresher({
        storageUtility: mockRefresherDefaultStorageUtility(),
      });

      const refreshedTokens = await refresher.refresh(
        "mySession",
        "some refresh token",
        await generateDpopKeyPair(),
      );

      expect(refreshedTokens.tokenType).toBe(expectedType);
    },
  );

  it("computes the expiration date in seconds from the 'expires_in' value", async () => {
    await mockTokenEndpoint({ expires_in: 1800 });
    const refresher = getTokenRefresher({
      storageUtility: mockRefresherDefaultStorageUtility(),
    });

    const before = Math.trunc(Date.now() / 1000);
    const refreshedTokens = await refresher.refresh(
      "mySession",
      "some refresh token",
      await generateDpopKeyPair(),
    );
    const after = Math.trunc(Date.now() / 1000);

    expect(refreshedTokens.expiresAt).toBeGreaterThanOrEqual(before + 1800);
    expect(refreshedTokens.expiresAt).toBeLessThanOrEqual(after + 1800);
  });

  it("does not set an expiration date if the IdP does not return 'expires_in'", async () => {
    await mockTokenEndpoint({ expires_in: undefined });
    const refresher = getTokenRefresher({
      storageUtility: mockRefresherDefaultStorageUtility(),
    });

    const refreshedTokens = await refresher.refresh(
      "mySession",
      "some refresh token",
      await generateDpopKeyPair(),
    );

    expect(refreshedTokens.expiresAt).toBeUndefined();
  });

  it("validates the ID token with the issuer JWKS", async () => {
    const tokenResponse = await mockTokenEndpoint();
    const refresher = getTokenRefresher({
      storageUtility: mockRefresherDefaultStorageUtility(),
    });

    await refresher.refresh(
      "mySession",
      "some refresh token",
      await generateDpopKeyPair(),
    );

    const { getWebidFromTokenPayload } = jest.requireMock(
      "@inrupt/solid-client-authn-core",
    ) as jest.Mocked<typeof SolidClientAuthnCore>;
    expect(getWebidFromTokenPayload).toHaveBeenCalledWith(
      tokenResponse.id_token as string,
      mockDefaultIssuerConfig().jwksUri,
      mockDefaultIssuerConfig().issuer,
      mockDefaultClient().clientId,
    );
  });

  it("throws if the issuer configuration has no JWKS URI", async () => {
    await mockTokenEndpoint();
    const refresher = getTokenRefresher({
      storageUtility: mockRefresherDefaultStorageUtility(),
      issuerConfigFetcher: mockIssuerConfigFetcher(
        mockIssuerConfig({ jwksUri: undefined }),
      ),
    });

    await expect(
      refresher.refresh(
        "mySession",
        "some refresh token",
        await generateDpopKeyPair(),
      ),
    ).rejects.toThrow(
      "Cannot verify ID Token: Issuer Metadata is missing a JWKS URI",
    );
  });

  it("stores the refresh token if one is returned", async () => {
    await mockTokenEndpoint({ refresh_token: "some new refresh token" });
    const mockedStorage = mockRefresherDefaultStorageUtility();

    const refresher = getTokenRefresher({
      storageUtility: mockedStorage,
    });

    const refreshedTokens = await refresher.refresh(
      "mySession",
      "some old refresh token",
      await generateDpopKeyPair(),
    );
    expect(refreshedTokens.refreshToken).toBe("some new refresh token");
    expect(getTokenRequest().body.get("refresh_token")).toBe(
      "some old refresh token",
    );

    // Check that the session information is stored in the provided storage
    await expect(
      mockedStorage.getForUser("mySession", "refreshToken"),
    ).resolves.toBe("some new refresh token");
  });

  it("calls the refresh token rotation handler if one is provided", async () => {
    await mockTokenEndpoint({ refresh_token: "some new refresh token" });
    const mockEmitter = new EventEmitter();
    const mockEmit = jest.spyOn(mockEmitter, "emit");

    const refresher = getTokenRefresher({
      storageUtility: mockRefresherDefaultStorageUtility(),
    });

    const refreshedTokens = await refresher.refresh(
      "mySession",
      "some old refresh token",
      await generateDpopKeyPair(),
      mockEmitter,
    );

    expect(refreshedTokens.refreshToken).toBe("some new refresh token");
    expect(mockEmit).toHaveBeenCalledWith(
      EVENTS.NEW_REFRESH_TOKEN,
      "some new refresh token",
    );
  });

  it("emits the new tokens if an event emitter is provided", async () => {
    const tokenResponse = await mockTokenEndpoint({
      refresh_token: "some new refresh token",
    });
    const dpopKey = await generateDpopKeyPair();
    const mockEmitter = new EventEmitter();
    const mockEmit = jest.spyOn(mockEmitter, "emit");

    const refresher = getTokenRefresher({
      storageUtility: mockRefresherDefaultStorageUtility(),
    });

    const refreshedTokens = await refresher.refresh(
      "mySession",
      "some old refresh token",
      dpopKey,
      mockEmitter,
    );

    expect(mockEmit).toHaveBeenCalledWith(EVENTS.NEW_TOKENS, {
      accessToken: tokenResponse.access_token,
      idToken: tokenResponse.id_token,
      refreshToken: "some new refresh token",
      webId: mockWebId(),
      expiresAt: refreshedTokens.expiresAt,
      dpopKey,
      clientId: mockDefaultClient().clientId,
      issuer: mockDefaultIssuerConfig().issuer,
    });
  });

  it("throws if the IdP does not return an access token", async () => {
    // openid-client rejects such a response itself...
    await mockTokenEndpoint({ access_token: undefined });
    const refresher = getTokenRefresher({
      storageUtility: mockRefresherDefaultStorageUtility(),
    });

    await expect(
      refresher.refresh(
        "mySession",
        "some old refresh token",
        await generateDpopKeyPair(),
      ),
    ).rejects.toEqual(
      openidClientError(
        "invalid response encountered",
        '"response" body "access_token" property must be a string',
      ),
    );

    // ... but the refresher does not rely on it.
    getMockedGrant().mockResolvedValueOnce({
      ...(await mockTokenEndpointBody({ access_token: undefined })),
    } as unknown as Awaited<ReturnType<typeof OpenidClient.refreshTokenGrant>>);

    await expect(
      refresher.refresh(
        "mySession",
        "some old refresh token",
        await generateDpopKeyPair(),
      ),
    ).rejects.toThrow(
      `The Identity Provider [${
        mockDefaultIssuerConfig().issuer
      }] did not return the expected tokens on refresh: missing at least one of 'access_token', 'id_token'.`,
    );
  });

  it("throws if the IdP does not return an id token", async () => {
    await mockTokenEndpoint({ id_token: undefined });
    const refresher = getTokenRefresher({
      storageUtility: mockRefresherDefaultStorageUtility(),
    });

    await expect(
      refresher.refresh(
        "mySession",
        "some old refresh token",
        await generateDpopKeyPair(),
      ),
    ).rejects.toThrow(
      `The Identity Provider [${
        mockDefaultIssuerConfig().issuer
      }] did not return the expected tokens on refresh: missing at least one of 'access_token', 'id_token'.`,
    );
  });

  it("throws if the IdP returns an ID token with unexpected claims", async () => {
    await mockTokenEndpoint({
      id_token: await mockIdToken({ issuer: "https://some.other.idp/" }),
    });
    const refresher = getTokenRefresher({
      storageUtility: mockRefresherDefaultStorageUtility(),
    });

    await expect(
      refresher.refresh(
        "mySession",
        "some old refresh token",
        await generateDpopKeyPair(),
      ),
    ).rejects.toEqual(
      openidClientError(
        "unexpected JWT claim value encountered",
        'unexpected JWT "iss" (issuer) claim value',
      ),
    );
  });

  it("throws if the IdP returns an unknown token type", async () => {
    // openid-client rejects such a response itself...
    await mockTokenEndpoint({ token_type: "Some unknown token type" });
    const refresher = getTokenRefresher({
      storageUtility: mockRefresherDefaultStorageUtility(),
    });

    await expect(
      refresher.refresh(
        "mySession",
        "some old refresh token",
        await generateDpopKeyPair(),
      ),
    ).rejects.toEqual(
      openidClientError(
        "unsupported operation",
        "unsupported `token_type` value",
      ),
    );

    // ... but the refresher does not rely on it.
    getMockedGrant().mockResolvedValueOnce({
      ...(await mockTokenEndpointBody({
        token_type: "Some unknown token type",
      })),
    } as unknown as Awaited<ReturnType<typeof OpenidClient.refreshTokenGrant>>);

    await expect(
      refresher.refresh(
        "mySession",
        "some old refresh token",
        await generateDpopKeyPair(),
      ),
    ).rejects.toThrow(
      `The Identity Provider [${
        mockDefaultIssuerConfig().issuer
      }] returned an unknown token type: [Some unknown token type]`,
    );
  });
});
