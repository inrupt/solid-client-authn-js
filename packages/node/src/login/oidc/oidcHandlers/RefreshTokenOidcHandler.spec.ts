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
 * @hidden
 * @packageDocumentation
 */

import { jest, it, describe, expect } from "@jest/globals";
import {
  generateDpopKeyPair,
  mockStorageUtility,
  USER_SESSION_PREFIX,
} from "@inrupt/solid-client-authn-core";
// Until there is a broader support for submodules exports in the ecosystem,
// (e.g. jest supports them), we'll depend on an intermediary package that exports
// a single ES module. The submodule exports should be kept commented out to make
// it easier to transition back when possible.
// import fromKeyLike from "jose/jwk/from_key_like";
import { jwtVerify, fromKeyLike } from "@inrupt/jose-legacy-modules";
import { EventEmitter } from "events";
import {
  mockDefaultOidcOptions,
  mockOidcOptions,
} from "../__mocks__/IOidcOptions";
import RefreshTokenOidcHandler from "./RefreshTokenOidcHandler";
import {
  mockDefaultTokenRefresher,
  mockDefaultTokenSet,
  mockTokenRefresher,
} from "../refresh/__mocks__/TokenRefresher";

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

describe("RefreshTokenOidcHandler", () => {
  describe("canHandle", () => {
    it("doesn't handle options missing a refresh token", async () => {
      const refreshTokenOidcHandler = new RefreshTokenOidcHandler(
        mockDefaultTokenRefresher(),
        mockStorageUtility({})
      );
      await expect(
        refreshTokenOidcHandler.canHandle(
          mockOidcOptions({
            refreshToken: undefined,
            client: {
              clientId: "some client id",
              clientSecret: "some client secret",
              clientType: "dynamic",
            },
          })
        )
      ).resolves.toEqual(false);
    });

    it("doesn't handle options missing a client ID", async () => {
      const refreshTokenOidcHandler = new RefreshTokenOidcHandler(
        mockDefaultTokenRefresher(),
        mockStorageUtility({})
      );
      await expect(
        refreshTokenOidcHandler.canHandle(
          mockOidcOptions({
            refreshToken: "some refresh token",
            client: {
              // TS would prevent this configuration
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              clientId: undefined,
              clientSecret: "some client secret",
              clientType: "dynamic",
            },
          })
        )
      ).resolves.toEqual(false);
    });
  });

  describe("handle", () => {
    it("throws if the refresh token is missing", async () => {
      const refreshTokenOidcHandler = new RefreshTokenOidcHandler(
        mockDefaultTokenRefresher(),
        mockStorageUtility({})
      );
      await expect(() =>
        refreshTokenOidcHandler.handle(
          mockOidcOptions({
            refreshToken: undefined,
            client: {
              clientId: "some client id",
              clientSecret: "some client secret",
              clientType: "dynamic",
            },
          })
        )
      ).rejects.toThrow("missing one of 'refreshToken', 'clientId'");
    });

    it("uses the refresh token to get an access token", async () => {
      const mockedTokenRefresher = mockDefaultTokenRefresher();
      const mockedRefreshFunction = jest.spyOn(mockedTokenRefresher, "refresh");

      // This builds the fetch function holding the refresh token...
      const refreshTokenOidcHandler = new RefreshTokenOidcHandler(
        mockedTokenRefresher,
        mockStorageUtility({})
      );
      const result = await refreshTokenOidcHandler.handle(
        mockOidcOptions({
          refreshToken: "some refresh token",
          client: {
            clientId: "some client id",
            clientSecret: "some client secret",
            clientType: "dynamic",
          },
        })
      );
      expect(result?.webId).toEqual("https://my.webid/");

      const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;
      mockedFetch.mockResolvedValue({
        status: 401,
        url: "https://my.pod/resource",
      });
      if (result !== undefined) {
        // ... and this should trigger the refresh flow.
        await result.fetch("https://some.pod/resource");
      }
      expect(mockedRefreshFunction).toHaveBeenCalled();
    });

    it("returns an authenticated fetch if the credentials are valid", async () => {
      // This builds the fetch function holding the refresh token...
      const refreshTokenOidcHandler = new RefreshTokenOidcHandler(
        mockDefaultTokenRefresher(),
        mockStorageUtility({})
      );
      const result = await refreshTokenOidcHandler.handle(
        mockOidcOptions({
          refreshToken: "some refresh token",
          client: {
            clientId: "some client id",
            clientSecret: "some client secret",
            clientType: "dynamic",
          },
        })
      );
      expect(result).not.toBeUndefined();
      expect(result?.webId).toEqual("https://my.webid/");

      const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;
      mockedFetch.mockResolvedValue({
        status: 200,
        url: "https://some.pod/resource",
      });
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await result!.fetch("https://some.pod/resource");
      expect(mockedFetch.mock.calls[0][1].headers.Authorization).toContain(
        "DPoP some refreshed access token"
      );
    });

    it("reuses stored DPoP keys if any when refreshing the access token", async () => {
      const dpopKeyPair = await generateDpopKeyPair();

      // This builds the fetch function holding the refresh token...
      const refreshTokenOidcHandler = new RefreshTokenOidcHandler(
        mockDefaultTokenRefresher(),
        mockStorageUtility({
          [`${USER_SESSION_PREFIX}:mySession`]: {
            publicKey: JSON.stringify(dpopKeyPair.publicKey),
            privateKey: JSON.stringify(
              await fromKeyLike(dpopKeyPair.privateKey)
            ),
          },
        })
      );
      const result = await refreshTokenOidcHandler.handle(
        mockOidcOptions({
          refreshToken: "some refresh token",
          client: {
            clientId: "some client id",
            clientSecret: "some client secret",
            clientType: "dynamic",
          },
        })
      );

      const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;
      mockedFetch.mockResolvedValue({
        status: 200,
        url: "https://some.pod/resource",
      });
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await result!.fetch("https://some.pod/resource");
      const dpopProof = mockedFetch.mock.calls[0][1].headers.DPoP;
      // This checks that the refreshed access token is bound to the initial DPoP key.
      await expect(
        jwtVerify(dpopProof, dpopKeyPair.privateKey)
      ).resolves.not.toThrow();
    });

    it("returns a bearer-authenticated fetch if the credentials are valid", async () => {
      // This builds the fetch function holding the refresh token...
      const refreshTokenOidcHandler = new RefreshTokenOidcHandler(
        mockDefaultTokenRefresher(),
        mockStorageUtility({})
      );
      const result = await refreshTokenOidcHandler.handle(
        mockOidcOptions({
          refreshToken: "some refresh token",
          client: {
            clientId: "some client id",
            clientSecret: "some client secret",
            clientType: "dynamic",
          },
          dpop: false,
        })
      );
      expect(result).not.toBeUndefined();

      const mockedFetch = jest.requireMock("cross-fetch") as jest.Mock;
      mockedFetch.mockResolvedValue({
        status: 200,
        url: "https://some.pod/resource",
      });
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await result!.fetch("https://some.pod/resource");
      expect(mockedFetch.mock.calls[0][1].headers.Authorization).toContain(
        "Bearer some refreshed access token"
      );
    });

    it("stores OIDC context in storage so that refreshing the token succeeds later", async () => {
      const mockedStorage = mockStorageUtility({});
      const refreshTokenOidcHandler = new RefreshTokenOidcHandler(
        mockDefaultTokenRefresher(),
        mockedStorage
      );
      await refreshTokenOidcHandler.handle(
        mockOidcOptions({
          refreshToken: "some refresh token",
          client: {
            clientId: "some client id",
            clientSecret: "some client secret",
            clientName: "some client name",
            clientType: "dynamic",
          },
        })
      );
      await expect(
        mockedStorage.getForUser(mockDefaultOidcOptions().sessionId, "clientId")
      ).resolves.toEqual("some client id");
      await expect(
        mockedStorage.getForUser(
          mockDefaultOidcOptions().sessionId,
          "clientSecret"
        )
      ).resolves.toEqual("some client secret");
      await expect(
        mockedStorage.getForUser(
          mockDefaultOidcOptions().sessionId,
          "clientName"
        )
      ).resolves.toEqual("some client name");
      await expect(
        mockedStorage.getForUser(mockDefaultOidcOptions().sessionId, "issuer")
      ).resolves.toEqual(mockDefaultOidcOptions().issuer);
    });
  });

  it("supports a public client without a secret", async () => {
    const mockedStorage = mockStorageUtility({});
    const refreshTokenOidcHandler = new RefreshTokenOidcHandler(
      mockDefaultTokenRefresher(),
      mockedStorage
    );
    const result = await refreshTokenOidcHandler.handle(
      mockOidcOptions({
        refreshToken: "some refresh token",
        client: {
          clientId: "some client id",
          clientSecret: undefined,
          clientName: "some client name",
          clientType: "dynamic",
        },
      })
    );
    expect(result).not.toBeUndefined();
  });

  it("throws if the IdP does not return an ID token", async () => {
    // This builds the fetch function holding the refresh token...
    const refreshTokenOidcHandler = new RefreshTokenOidcHandler(
      mockTokenRefresher({
        accessToken: "some access token",
      }),
      mockStorageUtility({})
    );
    const result = refreshTokenOidcHandler.handle(
      mockOidcOptions({
        refreshToken: "some refresh token",
        client: {
          clientId: "some client id",
          clientSecret: "some client secret",
          clientType: "dynamic",
        },
      })
    );
    await expect(result).rejects.toThrow(
      "The Identity Provider [https://example.com] did not return an ID token on refresh, which prevents us from getting the user's WebID."
    );
  });

  it("uses the rotated refresh token to build the DPoP-authenticated fetch if applicable", async () => {
    const tokenSet = mockDefaultTokenSet();
    tokenSet.refreshToken = "some rotated refresh token";
    const mockedTokenRefresher = mockTokenRefresher(tokenSet);
    const coreModule = jest.requireMock(
      "@inrupt/solid-client-authn-core"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;
    const mockAuthenticatedFetchBuild = jest.spyOn(
      coreModule,
      "buildAuthenticatedFetch"
    );

    // This builds the fetch function holding the refresh token...
    const refreshTokenOidcHandler = new RefreshTokenOidcHandler(
      mockedTokenRefresher,
      mockStorageUtility({})
    );
    const result = await refreshTokenOidcHandler.handle(
      mockOidcOptions({
        refreshToken: "some refresh token",
        client: {
          clientId: "some client id",
          clientSecret: "some client secret",
          clientType: "dynamic",
        },
      })
    );
    expect(result?.webId).toEqual("https://my.webid/");

    expect(mockAuthenticatedFetchBuild).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        refreshOptions: {
          refreshToken: "some rotated refresh token",
          sessionId: "mySession",
          tokenRefresher: mockedTokenRefresher,
        },
      })
    );
  });

  it("calls the token refresher if applicable", async () => {
    const tokenSet = mockDefaultTokenSet();
    tokenSet.refreshToken = "some rotated refresh token";
    const mockedTokenRefresher = mockTokenRefresher(tokenSet);
    const mockEmitter = new EventEmitter();

    // This builds the fetch function holding the refresh token...
    const refreshTokenOidcHandler = new RefreshTokenOidcHandler(
      mockedTokenRefresher,
      mockStorageUtility({})
    );
    await refreshTokenOidcHandler.handle(
      mockOidcOptions({
        refreshToken: "some refresh token",
        client: {
          clientId: "some client id",
          clientSecret: "some client secret",
          clientType: "dynamic",
        },
        eventEmitter: mockEmitter,
      })
    );

    expect(mockedTokenRefresher.refresh).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      mockEmitter
    );
  });

  it("throws if the credentials are incorrect", async () => {
    const tokenRefresher = mockTokenRefresher({
      accessToken: "some access token",
    });
    tokenRefresher.refresh = jest
      .fn()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockRejectedValue("Invalid credentials") as any;
    const refreshTokenOidcHandler = new RefreshTokenOidcHandler(
      tokenRefresher,
      mockStorageUtility({})
    );
    const result = refreshTokenOidcHandler.handle(
      mockOidcOptions({
        refreshToken: "some refresh token",
        client: {
          clientId: "some client id",
          clientSecret: "some client secret",
          clientType: "dynamic",
        },
      })
    );
    await expect(result).rejects.toThrow("Invalid credentials");
  });
});
