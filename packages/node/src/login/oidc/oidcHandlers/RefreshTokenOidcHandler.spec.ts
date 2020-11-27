/*
 * Copyright 2020 Inrupt Inc.
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

import "reflect-metadata";
import { mockOidcOptions } from "../__mocks__/IOidcOptions";
import RefreshTokenOidcHandler from "./RefreshTokenOidcHandler";
import { mockDefaultTokenRefresher } from "../refresh/__mocks__/TokenRefresher";

jest.mock("cross-fetch");

describe("RefreshTokenOidcHandler", () => {
  describe("canHandle", () => {
    it("doesn't handle options missing a refresh token", async () => {
      const refreshTokenOidcHandler = new RefreshTokenOidcHandler(
        mockDefaultTokenRefresher()
      );
      await expect(
        refreshTokenOidcHandler.canHandle(
          mockOidcOptions({
            refreshToken: undefined,
            client: {
              clientId: "some client id",
              clientSecret: "some client secret",
            },
          })
        )
      ).resolves.toEqual(false);
    });

    it("doesn't handle options missing a client ID", async () => {
      const refreshTokenOidcHandler = new RefreshTokenOidcHandler(
        mockDefaultTokenRefresher()
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
            },
          })
        )
      ).resolves.toEqual(false);
    });

    it("doesn't handle options missing a client secret", async () => {
      const refreshTokenOidcHandler = new RefreshTokenOidcHandler(
        mockDefaultTokenRefresher()
      );
      await expect(
        refreshTokenOidcHandler.canHandle(
          mockOidcOptions({
            refreshToken: "some refresh token",
            client: {
              clientId: "some client id",
              clientSecret: undefined,
            },
          })
        )
      ).resolves.toEqual(false);
    });
  });

  describe("handle", () => {
    it("throws if the refresh token is missing", async () => {
      const refreshTokenOidcHandler = new RefreshTokenOidcHandler(
        mockDefaultTokenRefresher()
      );
      await expect(() =>
        refreshTokenOidcHandler.handle(
          mockOidcOptions({
            refreshToken: undefined,
            client: {
              clientId: "some client id",
              clientSecret: "some client secret",
            },
          })
        )
      ).rejects.toThrow(
        "missing one of 'refreshToken', 'clientId', 'clientSecret'"
      );
    });

    it("throws if the client secret is missing", async () => {
      const refreshTokenOidcHandler = new RefreshTokenOidcHandler(
        mockDefaultTokenRefresher()
      );
      await expect(() =>
        refreshTokenOidcHandler.handle(
          mockOidcOptions({
            refreshToken: "some refresh token",
            client: {
              clientId: "some client id",
              clientSecret: undefined,
            },
          })
        )
      ).rejects.toThrow(
        "missing one of 'refreshToken', 'clientId', 'clientSecret'"
      );
    });

    it("uses the refresh token to get an access token", async () => {
      const mockedTokenRefresher = mockDefaultTokenRefresher();
      const mockedRefreshFunction = jest.spyOn(mockedTokenRefresher, "refresh");

      // This builds the fetch function holding the refresh token...
      const refreshTokenOidcHandler = new RefreshTokenOidcHandler(
        mockedTokenRefresher
      );
      const result = await refreshTokenOidcHandler.handle(
        mockOidcOptions({
          refreshToken: "some refresh token",
          client: {
            clientId: "some client id",
            clientSecret: "some client secret",
          },
        })
      );
      expect(result).not.toBeUndefined();

      const mockedFetch = jest.requireMock("cross-fetch");
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
        mockDefaultTokenRefresher()
      );
      const result = await refreshTokenOidcHandler.handle(
        mockOidcOptions({
          refreshToken: "some refresh token",
          client: {
            clientId: "some client id",
            clientSecret: "some client secret",
          },
        })
      );
      expect(result).not.toBeUndefined();

      const mockedFetch = jest.requireMock("cross-fetch");
      mockedFetch.mockResolvedValue({
        status: 401,
        url: "https://some.pod/resource",
      });
      if (result !== undefined) {
        // ... and this should trigger the refresh flow.
        await result.fetch("https://some.pod/resource");
      }
      expect(mockedFetch.mock.calls[1][1].headers.Authorization).toContain(
        "DPoP some refreshed access token"
      );
    });

    it("returns a bearer-authenticated fetch if the credentials are valid", async () => {
      // This builds the fetch function holding the refresh token...
      const refreshTokenOidcHandler = new RefreshTokenOidcHandler(
        mockDefaultTokenRefresher()
      );
      const result = await refreshTokenOidcHandler.handle(
        mockOidcOptions({
          refreshToken: "some refresh token",
          client: {
            clientId: "some client id",
            clientSecret: "some client secret",
          },
          dpop: false,
        })
      );
      expect(result).not.toBeUndefined();

      const mockedFetch = jest.requireMock("cross-fetch");
      mockedFetch.mockResolvedValue({
        status: 401,
        url: "https://some.pod/resource",
      });
      if (result !== undefined) {
        // ... and this should trigger the refresh flow.
        await result.fetch("https://some.pod/resource");
      }
      expect(mockedFetch.mock.calls[1][1].headers.Authorization).toContain(
        "Bearer some refreshed access token"
      );
    });
  });
});
