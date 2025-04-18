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
 * @hidden
 * @packageDocumentation
 */

import { jest, it, describe, expect } from "@jest/globals";
import {
  generateDpopKeyPair,
  mockStorageUtility,
  USER_SESSION_PREFIX,
} from "@inrupt/solid-client-authn-core";
import type * as SolidClientAuthnCore from "@inrupt/solid-client-authn-core";
import { randomUUID } from "crypto";
import { jwtVerify, exportJWK } from "jose";
import { EventEmitter } from "events";
import {
  mockDefaultOidcOptions,
  mockOidcOptions,
} from "../__mocks__/IOidcOptions";
import { mockDefaultClient } from "../__mocks__/ClientRegistrar";
import RefreshTokenOidcHandler from "./RefreshTokenOidcHandler";
import {
  mockDefaultTokenRefresher,
  mockDefaultTokenSet,
  mockTokenRefresher,
} from "../refresh/__mocks__/TokenRefresher";

const mockedFetch = jest
  .spyOn(globalThis, "fetch")
  .mockResolvedValue(new Response());

const EXAMPLE_CLIENT_ID = "d788f39d-c1e4-4c06-b68d-133149d26001";

jest.mock("@inrupt/solid-client-authn-core", () => {
  const actualCoreModule = jest.requireActual(
    "@inrupt/solid-client-authn-core",
  ) as typeof SolidClientAuthnCore;
  return {
    ...actualCoreModule,
    // This works around the network lookup to the JWKS in order to validate the ID token.
    getWebidFromTokenPayload: jest.fn(() =>
      Promise.resolve({
        webId: "https://my.webid/",
        clientId: EXAMPLE_CLIENT_ID,
      }),
    ),
  };
});
jest.useFakeTimers();

describe("RefreshTokenOidcHandler", () => {
  describe("canHandle", () => {
    it("doesn't handle options missing a refresh token", async () => {
      const refreshTokenOidcHandler = new RefreshTokenOidcHandler(
        mockDefaultTokenRefresher(),
        mockStorageUtility({}),
      );
      await expect(
        refreshTokenOidcHandler.canHandle(
          mockOidcOptions({
            refreshToken: undefined,
            client: mockDefaultClient(),
          }),
        ),
      ).resolves.toBe(false);
    });

    it("doesn't handle options missing a client ID", async () => {
      const refreshTokenOidcHandler = new RefreshTokenOidcHandler(
        mockDefaultTokenRefresher(),
        mockStorageUtility({}),
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
              clientSecret: randomUUID(),
              clientType: "dynamic",
            },
          }),
        ),
      ).resolves.toBe(false);
    });
  });

  describe("handle", () => {
    it("throws if the refresh token is missing", async () => {
      const refreshTokenOidcHandler = new RefreshTokenOidcHandler(
        mockDefaultTokenRefresher(),
        mockStorageUtility({}),
      );
      await expect(() =>
        refreshTokenOidcHandler.handle(
          mockOidcOptions({
            refreshToken: undefined,
            client: mockDefaultClient(),
          }),
        ),
      ).rejects.toThrow("missing one of 'refreshToken', 'clientId'");
    });

    it("uses the refresh token to get an access token", async () => {
      const mockedTokenRefresher = mockDefaultTokenRefresher();
      const mockedRefreshFunction = jest.spyOn(mockedTokenRefresher, "refresh");

      // This builds the fetch function holding the refresh token...
      const refreshTokenOidcHandler = new RefreshTokenOidcHandler(
        mockedTokenRefresher,
        mockStorageUtility({}),
      );
      const result = await refreshTokenOidcHandler.handle(
        mockOidcOptions({
          refreshToken: "some refresh token",
          client: mockDefaultClient(),
        }),
      );
      expect(result?.webId).toBe("https://my.webid/");

      mockedFetch.mockResolvedValue({
        ...new Response(undefined, { status: 401 }),
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
        mockStorageUtility({}),
      );
      const result = (await refreshTokenOidcHandler.handle(
        mockOidcOptions({
          refreshToken: "some refresh token",
          client: mockDefaultClient(),
        }),
      )) as SolidClientAuthnCore.LoginResult;
      expect(result).toBeDefined();
      expect(result?.getLogoutUrl).toBeDefined();
      expect(result?.webId).toBe("https://my.webid/");
      expect(result?.expirationDate).toBeGreaterThan(Date.now());

      mockedFetch.mockResolvedValue({
        ...new Response(undefined, { status: 200 }),
        url: "https://my.pod/resource",
      });
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await result!.fetch("https://some.pod/resource");
      const headers = new Headers(mockedFetch.mock.calls[0][1]?.headers);
      expect(headers.get("Authorization")).toContain(
        "DPoP some refreshed access token",
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
            privateKey: JSON.stringify(await exportJWK(dpopKeyPair.privateKey)),
          },
        }),
      );
      const result = await refreshTokenOidcHandler.handle(
        mockOidcOptions({
          refreshToken: "some refresh token",
          client: mockDefaultClient(),
        }),
      );

      mockedFetch.mockResolvedValue({
        ...new Response(undefined, { status: 200 }),
        url: "https://my.pod/resource",
      });
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await result!.fetch("https://some.pod/resource");
      const headers = new Headers(mockedFetch.mock.calls[0][1]?.headers);
      const dpopProof = headers.get("DPoP");
      // This checks that the refreshed access token is bound to the initial DPoP key.
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        jwtVerify(dpopProof!, dpopKeyPair.privateKey),
      ).resolves.not.toThrow();
    });

    it("returns a bearer-authenticated fetch if the credentials are valid", async () => {
      // This builds the fetch function holding the refresh token...
      const refreshTokenOidcHandler = new RefreshTokenOidcHandler(
        mockDefaultTokenRefresher(),
        mockStorageUtility({}),
      );
      const result = await refreshTokenOidcHandler.handle(
        mockOidcOptions({
          refreshToken: "some refresh token",
          client: mockDefaultClient(),
          dpop: false,
        }),
      );
      expect(result).toBeDefined();

      mockedFetch.mockResolvedValue({
        ...new Response(undefined, { status: 200 }),
        url: "https://my.pod/resource",
      });
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await result!.fetch("https://some.pod/resource");
      const headers = new Headers(mockedFetch.mock.calls[0][1]?.headers);
      expect(headers.get("Authorization")).toContain(
        "Bearer some refreshed access token",
      );
    });

    it("stores OIDC context in storage so that refreshing the token succeeds later", async () => {
      const mockedClient = mockDefaultClient();
      mockedClient.clientId = EXAMPLE_CLIENT_ID;
      mockedClient.clientName = "some client name";

      const mockedStorage = mockStorageUtility({});
      const refreshTokenOidcHandler = new RefreshTokenOidcHandler(
        mockDefaultTokenRefresher(),
        mockedStorage,
      );
      await refreshTokenOidcHandler.handle(
        mockOidcOptions({
          refreshToken: "some refresh token",
          client: mockedClient,
        }),
      );
      await expect(
        mockedStorage.getForUser(
          mockDefaultOidcOptions().sessionId,
          "clientId",
        ),
      ).resolves.toBe(EXAMPLE_CLIENT_ID);
      await expect(
        mockedStorage.getForUser(
          mockDefaultOidcOptions().sessionId,
          "clientSecret",
        ),
      ).resolves.toBe(mockedClient.clientSecret);
      await expect(
        mockedStorage.getForUser(
          mockDefaultOidcOptions().sessionId,
          "clientName",
        ),
      ).resolves.toBe("some client name");
      await expect(
        mockedStorage.getForUser(mockDefaultOidcOptions().sessionId, "issuer"),
      ).resolves.toEqual(mockDefaultOidcOptions().issuer);
    });
  });

  it("supports a public client without a secret", async () => {
    const mockedStorage = mockStorageUtility({});
    const refreshTokenOidcHandler = new RefreshTokenOidcHandler(
      mockDefaultTokenRefresher(),
      mockedStorage,
    );
    const result = await refreshTokenOidcHandler.handle(
      mockOidcOptions({
        refreshToken: "some refresh token",
        client: {
          clientId: "some client id",
          clientName: "some client name",
          clientType: "dynamic",
        },
      }),
    );
    expect(result).toBeDefined();
  });

  it("throws if the IdP does not return an ID token", async () => {
    // This builds the fetch function holding the refresh token...
    const refreshTokenOidcHandler = new RefreshTokenOidcHandler(
      mockTokenRefresher({
        accessToken: randomUUID(),
      }),
      mockStorageUtility({}),
    );
    const result = refreshTokenOidcHandler.handle(
      mockOidcOptions({
        refreshToken: "some refresh token",
        client: mockDefaultClient(),
      }),
    );
    await expect(result).rejects.toThrow(
      "The Identity Provider [https://example.com] did not return an ID token on refresh, which prevents us from getting the user's WebID.",
    );
  });

  it("uses the rotated refresh token to build the DPoP-authenticated fetch if applicable", async () => {
    const tokenSet = mockDefaultTokenSet();
    tokenSet.refreshToken = "some rotated refresh token";
    const mockedTokenRefresher = mockTokenRefresher(tokenSet);
    const coreModule = jest.requireMock(
      "@inrupt/solid-client-authn-core",
    ) as typeof SolidClientAuthnCore;
    const mockAuthenticatedFetchBuild = jest.spyOn(
      coreModule,
      "buildAuthenticatedFetch",
    );

    // This builds the fetch function holding the refresh token...
    const refreshTokenOidcHandler = new RefreshTokenOidcHandler(
      mockedTokenRefresher,
      mockStorageUtility({}),
    );
    const result = await refreshTokenOidcHandler.handle(
      mockOidcOptions({
        refreshToken: "some refresh token",
        client: mockDefaultClient(),
      }),
    );
    expect(result?.webId).toBe("https://my.webid/");
    expect(result?.clientAppId).toBe(EXAMPLE_CLIENT_ID);

    expect(mockAuthenticatedFetchBuild).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        refreshOptions: {
          refreshToken: "some rotated refresh token",
          sessionId: "mySession",
          tokenRefresher: mockedTokenRefresher,
        },
      }),
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
      mockStorageUtility({}),
    );
    await refreshTokenOidcHandler.handle(
      mockOidcOptions({
        refreshToken: "some refresh token",
        client: mockDefaultClient(),
        eventEmitter: mockEmitter,
      }),
    );

    expect(mockedTokenRefresher.refresh).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it("throws if the credentials are incorrect", async () => {
    const tokenRefresher = mockTokenRefresher({
      accessToken: randomUUID(),
    });
    tokenRefresher.refresh = jest
      .fn<typeof tokenRefresher.refresh>()
      .mockRejectedValue("Invalid credentials");
    const refreshTokenOidcHandler = new RefreshTokenOidcHandler(
      tokenRefresher,
      mockStorageUtility({}),
    );
    const result = refreshTokenOidcHandler.handle(
      mockOidcOptions({
        refreshToken: "some refresh token",
        client: mockDefaultClient(),
      }),
    );
    await expect(result).rejects.toThrow("Invalid credentials");
  });
});
