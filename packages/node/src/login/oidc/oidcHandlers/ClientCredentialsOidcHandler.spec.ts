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

/**
 * Test for AuthorizationCodeWithPkceOidcHandler
 */
import { mockStorageUtility } from "@inrupt/solid-client-authn-core";
import { jest, it, describe } from "@jest/globals";
import { IdTokenClaims, TokenSet } from "openid-client";
import { JWK } from "jose/types";
import { mockDefaultTokenRefresher } from "../refresh/__mocks__/TokenRefresher";
import { standardOidcOptions } from "../__mocks__/IOidcOptions";
import ClientCredentialsOidcHandler from "./ClientCredentialsOidcHandler";

import { mockDefaultIssuerConfig } from "../__mocks__/IssuerConfigFetcher";

jest.mock("openid-client");
jest.mock("cross-fetch");
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
    sub: "https://my.webid/",
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

const mockBearerTokens = (): TokenSet => {
  return {
    access_token: "some token",
    id_token: mockIdToken(),
    token_type: "Bearer",
    expired: () => false,
    claims: mockIdTokenPayload,
  };
};

const setupOidcClientMock = (tokenSet: TokenSet) => {
  const { Issuer } = jest.requireMock("openid-client") as any;
  function clientConstructor() {
    // this is untyped, which makes TS complain
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.grant = jest.fn().mockResolvedValueOnce(tokenSet);
  }
  const mockedIssuer = {
    metadata: mockDefaultIssuerConfig(),
    Client: clientConstructor,
  };
  Issuer.mockReturnValueOnce(mockedIssuer);
};

describe("ClientCredentialsOidcHandler", () => {
  describe("canHandle", () => {
    it("cannot handle if the client ID is missing", async () => {
      const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
        mockDefaultTokenRefresher(),
        mockStorageUtility({})
      );
      await expect(
        clientCredentialsOidcHandler.canHandle({
          ...standardOidcOptions,
          client: {
            clientId: undefined as unknown as string,
            clientType: "static",
          },
        })
      ).resolves.toEqual(false);
    });

    it("cannot handle if the client secret is missing", async () => {
      const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
        mockDefaultTokenRefresher(),
        mockStorageUtility({})
      );
      await expect(
        clientCredentialsOidcHandler.canHandle({
          ...standardOidcOptions,
          client: {
            clientId: "some client ID",
            clientSecret: undefined,
            clientType: "static",
          },
        })
      ).resolves.toEqual(false);
    });

    it("cannot handle if the client is not statically registered", async () => {
      const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
        mockDefaultTokenRefresher(),
        mockStorageUtility({})
      );
      await expect(
        clientCredentialsOidcHandler.canHandle({
          ...standardOidcOptions,
          client: {
            clientId: "some client ID",
            clientSecret: "some secret",
            clientType: "dynamic",
          },
        })
      ).resolves.toEqual(false);
    });

    it("can handle if both client ID and secret are present for a confidential client", async () => {
      const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
        mockDefaultTokenRefresher(),
        mockStorageUtility({})
      );
      await expect(
        clientCredentialsOidcHandler.canHandle({
          ...standardOidcOptions,
          client: {
            clientId: "some client ID",
            clientSecret: "some client secret",
            clientType: "static",
          },
        })
      ).resolves.toEqual(true);
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
      mockStorageUtility({})
    );
    await expect(
      clientCredentialsOidcHandler.handle({
        ...standardOidcOptions,
        client: {
          clientId: "some client ID",
          clientSecret: "some client secret",
          clientType: "static",
        },
      })
    ).rejects.toThrow(
      /Invalid response from Solid Identity Provider \[.+\]: \{.+\} is missing 'access_token'/
    );
  });

  it("throws if the issuer does not return an ID token", async () => {
    const tokens = mockDpopTokens();
    tokens.id_token = undefined;
    setupOidcClientMock(tokens);
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockDefaultTokenRefresher(),
      mockStorageUtility({})
    );
    await expect(
      clientCredentialsOidcHandler.handle({
        ...standardOidcOptions,
        client: {
          clientId: "some client ID",
          clientSecret: "some client secret",
          clientType: "static",
        },
      })
    ).rejects.toThrow(
      /Invalid response from Solid Identity Provider \[.+\]: \{.+\} is missing 'id_token'/
    );
  });

  it("builds a fetch authenticated with a DPoP token if appropriate", async () => {
    const tokens = mockDpopTokens();
    setupOidcClientMock(tokens);
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockDefaultTokenRefresher(),
      mockStorageUtility({})
    );
    const result = await clientCredentialsOidcHandler.handle({
      ...standardOidcOptions,
      dpop: true,
      client: {
        clientId: "some client ID",
        clientSecret: "some client secret",
        clientType: "static",
      },
    });

    const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;
    mockedFetch.mockResolvedValue({
      status: 200,
      url: "https://some.pod/resource",
    });
    await result?.fetch("https://some.pod/resource");
    expect(mockedFetch.mock.calls[0][1].headers.Authorization).toContain(
      `DPoP ${tokens.access_token}`
    );
  });

  it("builds a fetch authenticated with a Bearer token if appropriate", async () => {
    const tokens = mockBearerTokens();
    setupOidcClientMock(tokens);
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockDefaultTokenRefresher(),
      mockStorageUtility({})
    );
    const result = await clientCredentialsOidcHandler.handle({
      ...standardOidcOptions,
      dpop: false,
      client: {
        clientId: "some client ID",
        clientSecret: "some client secret",
        clientType: "static",
      },
    });

    const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;
    mockedFetch.mockResolvedValue({
      status: 200,
      url: "https://some.pod/resource",
    });
    await result?.fetch("https://some.pod/resource");
    expect(mockedFetch.mock.calls[0][1].headers.Authorization).toContain(
      `Bearer ${tokens.access_token}`
    );
  });

  it("builds a fetch authenticated handling the refresh flow if appropriate", async () => {
    const tokens = mockDpopTokens();
    tokens.refresh_token = "some refresh token";
    setupOidcClientMock(tokens);
    const refresher = mockDefaultTokenRefresher();
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      refresher,
      mockStorageUtility({})
    );
    const result = await clientCredentialsOidcHandler.handle({
      ...standardOidcOptions,
      dpop: true,
      client: {
        clientId: "some client ID",
        clientSecret: "some client secret",
        clientType: "static",
      },
    });

    const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;
    // A 401 error triggers the refresh flow.
    mockedFetch.mockResolvedValue({
      status: 401,
      url: "https://some.pod/resource",
    });
    await result?.fetch("https://some.pod/resource");
    expect(refresher.refresh).toHaveBeenCalled();
  });

  it("returns session info with the built fetch", async () => {
    const tokens = mockDpopTokens();
    setupOidcClientMock(tokens);
    const clientCredentialsOidcHandler = new ClientCredentialsOidcHandler(
      mockDefaultTokenRefresher(),
      mockStorageUtility({})
    );
    const result = await clientCredentialsOidcHandler.handle({
      ...standardOidcOptions,
      dpop: true,
      client: {
        clientId: "some client ID",
        clientSecret: "some client secret",
        clientType: "static",
      },
    });

    expect(result?.isLoggedIn).toBe(true);
    expect(result?.sessionId).toBe(standardOidcOptions.sessionId);
    expect(result?.webId).toBe(mockIdTokenPayload().sub);
  });
});
