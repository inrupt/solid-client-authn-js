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

/**
 * Test for AuthorizationCodeWithPkceOidcHandler
 */
import type * as SolidClientAuthnCore from "@inrupt/solid-client-authn-core";
import { jest, it, describe, expect } from "@jest/globals";
import type * as OpenidClient from "openid-client";
import type { JWK } from "jose";
import { randomUUID } from "crypto";
import { EventEmitter } from "events";
import { EVENTS } from "@inrupt/solid-client-authn-core";
import { mockDefaultTokenRefresher } from "../refresh/__mocks__/TokenRefresher";
import { standardOidcOptions } from "../__mocks__/IOidcOptions";
import ClientCredentialsOidcHandler from "./ClientCredentialsOidcHandler";

import { mockDefaultIssuerConfig } from "../__mocks__/IssuerConfigFetcher";
import { mockDefaultClient } from "../__mocks__/ClientRegistrar";

jest.mock("openid-client");

const mockedFetch = jest.spyOn(globalThis, "fetch");

jest.mock("@inrupt/solid-client-authn-core", () => {
  const actualCoreModule = jest.requireActual(
    "@inrupt/solid-client-authn-core",
  ) as typeof SolidClientAuthnCore;
  return {
    ...actualCoreModule,
    // This works around the network lookup to the JWKS in order to validate the ID token.
    // getWebidFromTokenPayload: jest.fn(() =>
    //   Promise.resolve("https://my.webid/")
    // ),
    getWebidFromTokenPayload: jest.fn(),
  };
});
jest.useFakeTimers();
const DEFAULT_EXPIRATION_TIME_SECONDS = 300;

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

const mockIdToken = (): string =>
  "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJodHRwczovL215LndlYmlkIiwiaXNzIjoiaHR0cHM6Ly9teS5pZHAvIiwiYXVkIjoiaHR0cHM6Ly9yZXNvdXJjZS5leGFtcGxlLm9yZyIsImV4cCI6MTY2MjI2NjIxNiwiaWF0IjoxNDYyMjY2MjE2fQ.IwumuwJtQw5kUBMMHAaDPJBppfBpRHbiXZw_HlKe6GNVUWUlyQRYV7W7r9OQtHmMsi6GVwOckelA3ErmhrTGVw";

type AccessJwt = {
  webid: string;
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
    webid: mockWebId(),
    iss: mockDefaultIssuerConfig().issuer.toString(),
    aud: "https://resource.example.org",
    nbf: 1562262611,
    exp: 1562266216,
    cnf: {
      jkt: mockJwk().kid as string,
    },
  };
};

const mockIdTokenPayload = (): OpenidClient.IdTokenClaims => {
  return {
    sub: "https://my.webid/",
    iss: "https://my.idp/",
    aud: "https://resource.example.org",
    exp: 1662266216,
    iat: 1462266216,
  };
};

const mockDpopTokens = (): OpenidClient.TokenSet => {
  return {
    access_token: JSON.stringify(mockKeyBoundToken()),
    id_token: mockIdToken(),
    token_type: "DPoP",
    expired: () => false,
    claims: mockIdTokenPayload,
    expires_in: DEFAULT_EXPIRATION_TIME_SECONDS,
  };
};

const mockBearerTokens = (): OpenidClient.TokenSet => {
  return {
    access_token: "some token",
    id_token: mockIdToken(),
    token_type: "Bearer",
    expired: () => false,
    claims: mockIdTokenPayload,
    expires_in: DEFAULT_EXPIRATION_TIME_SECONDS,
  };
};

const setupOidcClientMock = (tokenSet: OpenidClient.TokenSet) => {
  const grantMock = jest
    .fn<() => Promise<OpenidClient.TokenSet>>()
    .mockResolvedValueOnce(tokenSet);
  const { Issuer } = jest.requireMock("openid-client") as jest.Mocked<
    typeof OpenidClient
  >;
  function clientConstructor() {
    // this is untyped, which makes TS complain
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.grant = grantMock;
  }

  const mockedIssuer = jest.mocked({
    metadata: mockDefaultIssuerConfig(),
    Client: clientConstructor,
    // Cast to unknown because only partially mocked
  } as unknown as OpenidClient.Issuer<OpenidClient.Client>);
  Issuer.mockReturnValueOnce(mockedIssuer);
  return grantMock;
};

const setupGetWebidMock = (webid: string, clientid?: string) => {
  const { getWebidFromTokenPayload } = jest.requireMock(
    "@inrupt/solid-client-authn-core",
  ) as jest.Mocked<typeof SolidClientAuthnCore>;
  getWebidFromTokenPayload.mockResolvedValueOnce({
    webId: webid,
    clientId: clientid,
  });
};

describe("ClientCredentialsOidcHandler", () => {
  describe("canHandle", () => {
    it("cannot handle if the client ID is missing", async () => {
      const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
        mockDefaultTokenRefresher(),
      );
      await expect(
        clientCredentialsOidcHandler.canHandle({
          ...standardOidcOptions,
          client: {
            // @ts-expect-error The client ID is undefined for test purposes.
            clientId: undefined,
            clientSecret: undefined,
            clientType: "static",
          },
        }),
      ).resolves.toBe(false);
    });

    it("cannot handle if the client secret is missing", async () => {
      const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
        mockDefaultTokenRefresher(),
      );
      await expect(
        clientCredentialsOidcHandler.canHandle({
          ...standardOidcOptions,
          client: {
            clientId: randomUUID(),
            clientSecret: randomUUID(),
            clientType: "static",
          },
        }),
      ).resolves.toBe(false);
    });

    it("cannot handle if the client is not statically registered", async () => {
      const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
        mockDefaultTokenRefresher(),
      );
      await expect(
        clientCredentialsOidcHandler.canHandle({
          ...standardOidcOptions,
          client: mockDefaultClient(),
        }),
      ).resolves.toBe(false);
    });

    it("can handle if both client ID and secret are present for a confidential client", async () => {
      const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
        mockDefaultTokenRefresher(),
      );
      await expect(
        clientCredentialsOidcHandler.canHandle({
          ...standardOidcOptions,
          client: {
            clientId: randomUUID(),
            clientSecret: randomUUID(),
            clientType: "static",
          },
          redirectUrl: undefined,
        }),
      ).resolves.toBe(true);
    });

    it("cannot handle if a redirectUrl has been specified (for auth code flow)", async () => {
      const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
        mockDefaultTokenRefresher(),
      );
      await expect(
        clientCredentialsOidcHandler.canHandle({
          ...standardOidcOptions,
          client: {
            clientId: randomUUID(),
            clientSecret: randomUUID(),
            clientType: "static",
          },
        }),
      ).resolves.toBe(false);
    });
  });
});

describe("handle", () => {
  it("throws if the issuer does not return an access token", async () => {
    const tokens = mockDpopTokens();
    tokens.access_token = undefined;
    setupOidcClientMock(tokens);
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockDefaultTokenRefresher(),
    );
    await expect(
      clientCredentialsOidcHandler.handle({
        ...standardOidcOptions,
        client: {
          clientId: randomUUID(),
          clientSecret: randomUUID(),
          clientType: "static",
        },
      }),
    ).rejects.toThrow(
      /Invalid response from Solid Identity Provider \[.+\]: \{.+\} is missing 'access_token'/,
    );
  });

  // Note that this is a temporary fix, and it will eventually be removed from the
  // codebase once the client credential use case is properly covered by the authentication
  // panel.
  it("gets the WebID from the access token if the issuer does not return an ID token", async () => {
    const tokens = mockDpopTokens();
    tokens.id_token = undefined;
    setupOidcClientMock(tokens);
    setupGetWebidMock("https://my.webid/");
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockDefaultTokenRefresher(),
    );

    const sessionInfo = await clientCredentialsOidcHandler.handle({
      ...standardOidcOptions,
      client: {
        clientId: randomUUID(),
        clientSecret: randomUUID(),
        clientType: "static",
      },
    });
    // The session's WebID should have been picked up from the access token in
    // the absence of an ID token.
    expect((sessionInfo as SolidClientAuthnCore.ISessionInfo).webId).toBe(
      "https://my.webid/",
    );
  });

  // Note that this is a temporary fix, and it will eventually be removed from the
  // codebase once the client credential use case is properly covered by the authentication
  // panel. This encodes assumptions about the Access Token which have emerged
  // in the current implementations, but is out of scope of the Solid-OIDC specification.
  it("throws if the Access Token doesn't have the expected shape and the issuer does not return an ID token", async () => {
    const tokens = mockDpopTokens();
    tokens.id_token = undefined;
    setupOidcClientMock(tokens);
    const { getWebidFromTokenPayload } = jest.requireMock(
      "@inrupt/solid-client-authn-core",
    ) as jest.Mocked<typeof SolidClientAuthnCore>;
    // Pretend the token validation function throws
    getWebidFromTokenPayload.mockRejectedValueOnce(new Error("Bad audience"));
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockDefaultTokenRefresher(),
    );

    await expect(
      clientCredentialsOidcHandler.handle({
        ...standardOidcOptions,
        client: {
          clientId: randomUUID(),
          clientSecret: randomUUID(),
          clientType: "static",
        },
      }),
    ).rejects.toThrow("Bad audience");
  });

  it("builds a fetch authenticated with a DPoP token if appropriate", async () => {
    const tokens = mockDpopTokens();
    setupOidcClientMock(tokens);
    setupGetWebidMock("https://my.webid/", "some client ID");
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockDefaultTokenRefresher(),
    );
    const result = await clientCredentialsOidcHandler.handle({
      ...standardOidcOptions,
      dpop: true,
      client: {
        clientId: randomUUID(),
        clientSecret: randomUUID(),
        clientType: "static",
      },
    });

    mockedFetch.mockResolvedValue(
      new Response(undefined, {
        status: 200,
      }),
    );
    await result?.fetch("https://some.pod/resource");
    const headers = new Headers(mockedFetch.mock.calls[0][1]?.headers);
    expect(headers.get("Authorization")).toContain(
      `DPoP ${tokens.access_token}`,
    );
  });

  it("builds a fetch authenticated with a Bearer token if appropriate", async () => {
    const tokens = mockBearerTokens();
    setupOidcClientMock(tokens);
    setupGetWebidMock("https://my.webid/", "some client ID");
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockDefaultTokenRefresher(),
    );
    const result = await clientCredentialsOidcHandler.handle({
      ...standardOidcOptions,
      dpop: false,
      client: {
        clientId: randomUUID(),
        clientSecret: randomUUID(),
        clientType: "static",
      },
    });

    mockedFetch.mockResolvedValue(
      new Response(undefined, {
        status: 200,
      }),
    );
    await result?.fetch("https://some.pod/resource");
    const headers = new Headers(mockedFetch.mock.calls[0][1]?.headers);
    expect(headers.get("Authorization")).toContain(
      `Bearer ${tokens.access_token}`,
    );
  });

  it("builds a fetch authenticated handling the refresh flow if appropriate", async () => {
    const tokens = mockDpopTokens();
    tokens.refresh_token = "some refresh token";
    setupOidcClientMock(tokens);
    setupGetWebidMock("https://my.webid/", "some client ID");
    const coreModule = jest.requireMock(
      "@inrupt/solid-client-authn-core",
    ) as typeof SolidClientAuthnCore;
    const mockAuthenticatedFetchBuild = jest.spyOn(
      coreModule,
      "buildAuthenticatedFetch",
    );
    const mockedRefresher = mockDefaultTokenRefresher();
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockedRefresher,
    );
    await clientCredentialsOidcHandler.handle({
      ...standardOidcOptions,
      dpop: true,
      client: {
        clientId: randomUUID(),
        clientSecret: randomUUID(),
        clientType: "static",
      },
    });

    expect(mockAuthenticatedFetchBuild).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        refreshOptions: {
          refreshToken: "some refresh token",
          sessionId: "mySession",
          tokenRefresher: mockedRefresher,
        },
      }),
    );
  });

  it("builds a fetch authenticated including the expiration value if present", async () => {
    const tokens = mockDpopTokens();
    setupOidcClientMock(tokens);
    setupGetWebidMock("https://my.webid/", "some client ID");
    const coreModule = jest.requireMock(
      "@inrupt/solid-client-authn-core",
    ) as typeof SolidClientAuthnCore;
    const mockAuthenticatedFetchBuild = jest.spyOn(
      coreModule,
      "buildAuthenticatedFetch",
    );
    const mockedRefresher = mockDefaultTokenRefresher();
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockedRefresher,
    );
    await clientCredentialsOidcHandler.handle({
      ...standardOidcOptions,
      dpop: true,
      client: {
        clientId: randomUUID(),
        clientSecret: randomUUID(),
        clientType: "static",
      },
    });

    expect(mockAuthenticatedFetchBuild).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        expiresIn: mockDpopTokens().expires_in,
      }),
    );
  });

  it("returns session info with the built fetch", async () => {
    const tokens = mockDpopTokens();
    setupOidcClientMock(tokens);
    setupGetWebidMock("https://my.webid/");
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockDefaultTokenRefresher(),
    );
    const result = await clientCredentialsOidcHandler.handle({
      ...standardOidcOptions,
      dpop: true,
      client: {
        clientId: randomUUID(),
        clientSecret: randomUUID(),
        clientType: "static",
      },
    });

    expect(result?.isLoggedIn).toBe(true);
    expect(result?.sessionId).toBe(standardOidcOptions.sessionId);
    expect(result?.webId).toBe("https://my.webid/");
    expect(result?.expirationDate).toBe(
      Date.now() + DEFAULT_EXPIRATION_TIME_SECONDS * 1000,
    );
  });

  it("calls the token set handler if one is provided", async () => {
    const tokens = mockDpopTokens();
    setupOidcClientMock(tokens);
    setupGetWebidMock("https://my.webid/");
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockDefaultTokenRefresher(),
    );
    const mockEmitter = new EventEmitter();
    const mockEmit = jest.spyOn(mockEmitter, "emit");

    await clientCredentialsOidcHandler.handle({
      ...standardOidcOptions,
      dpop: true,
      client: {
        clientId: randomUUID(),
        clientSecret: randomUUID(),
        clientType: "static",
      },
      eventEmitter: mockEmitter,
    });

    expect(mockEmit).toHaveBeenCalledWith(
      EVENTS.NEW_TOKENS,
      expect.objectContaining({
        accessToken: tokens.access_token,
        idToken: tokens.id_token,
        refreshToken: tokens.refresh_token,
        webId: "https://my.webid/",
        expiresAt: Date.now() + DEFAULT_EXPIRATION_TIME_SECONDS * 1000,
        dpopKey: expect.anything(),
      }),
    );
  });

  it("returns session info, including clientAppId, with the built fetch", async () => {
    const tokens = mockDpopTokens();
    setupOidcClientMock(tokens);
    setupGetWebidMock("https://my.webid/", "some client ID");
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockDefaultTokenRefresher(),
    );
    const result = await clientCredentialsOidcHandler.handle({
      ...standardOidcOptions,
      dpop: true,
      client: {
        clientId: "some client ID",
        clientSecret: randomUUID(),
        clientType: "static",
      },
    });
    expect(result?.isLoggedIn).toBe(true);
    expect(result?.sessionId).toBe(standardOidcOptions.sessionId);
    expect(result?.webId).toBe("https://my.webid/");
    expect(result?.clientAppId).toBe("some client ID");
    expect(result?.expirationDate).toBe(
      Date.now() + DEFAULT_EXPIRATION_TIME_SECONDS * 1000,
    );
  });

  it("uses the provided scopes in the token request", async () => {
    const tokens = mockDpopTokens();
    const mockedGrant = setupOidcClientMock(tokens);
    setupGetWebidMock("https://my.webid/");
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockDefaultTokenRefresher(),
    );
    await clientCredentialsOidcHandler.handle({
      ...standardOidcOptions,
      dpop: false,
      client: {
        clientId: randomUUID(),
        clientSecret: randomUUID(),
        clientType: "static",
      },
      scopes: ["openid", "webid", "custom_scope"],
    });

    expect(mockedGrant).toHaveBeenCalledWith(
      {
        grant_type: "client_credentials",
        token_endpoint_auth_method: "client_secret_basic",
        scope: "openid webid custom_scope",
      },
      {
        DPoP: undefined,
      },
    );
  });

  // The next test is skipped because the fake timers currently don't work
  // with the background refresh.
  it.skip("does not setup session refresh if keepAlive is false", async () => {
    // Mock timers to trigger token refresh.
    jest.useFakeTimers();
    const tokens = mockDpopTokens();
    setupOidcClientMock(tokens);
    const mockedRefresher = mockDefaultTokenRefresher();
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockedRefresher,
    );
    await clientCredentialsOidcHandler.handle({
      ...standardOidcOptions,
      dpop: true,
      keepAlive: false,
      client: {
        clientId: "some client ID",
        clientSecret: randomUUID(),
        clientType: "static",
      },
    });
    jest.advanceTimersByTime(500000);
    // This would pass, but simply because the timers don't work
    // properly, so it is NOT a functional test.
    expect(mockedRefresher.refresh).not.toHaveBeenCalled();
  });
});
