/**
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

import {
  StorageUtilityMock,
  mockStorageUtility
} from "../../src/storage/__mocks__/StorageUtility";
import "reflect-metadata";
import { default as LogoutHandler } from "../../src/logout/GeneralLogoutHandler";
import { RedirectorMock } from "../../src/login/oidc/__mocks__/Redirector";
import {
  IssuerConfigFetcherMock,
  mockConfigFetcher,
  IssuerConfigFetcherFetchConfigResponse
} from "../../src/login/oidc/__mocks__/IssuerConfigFetcher";
import URL from "url-parse";

describe("OidcLoginHandler", () => {
  const defaultMocks = {
    storageUtility: StorageUtilityMock,
    redirector: RedirectorMock,
    issuerConfigFetcher: IssuerConfigFetcherMock
  };
  function getInitialisedHandler(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): LogoutHandler {
    return new LogoutHandler(
      mocks.storageUtility ?? defaultMocks.storageUtility,
      mocks.redirector ?? defaultMocks.redirector,
      mocks.issuerConfigFetcher ?? defaultMocks.issuerConfigFetcher
    );
  }

  describe("canHandle", () => {
    it("should always be able to handle logout", async () => {
      const logoutHandler = getInitialisedHandler({
        storageUtility: mockStorageUtility({})
      });
      await expect(logoutHandler.canHandle()).resolves.toBe(true);
    });
  });

  describe("retrieveSessionEndpoint", () => {
    it("should throw if the IdP cannot be retrieved for the session", async () => {
      const logoutHandler = getInitialisedHandler({
        storageUtility: mockStorageUtility({})
      });
      await expect(
        logoutHandler.retrieveSessionEndpoint("someUser")
      ).rejects.toThrow(
        "Cannot find the Identity Provider for session [someUser] in storage, preventing logout to complete successfully."
      );
    });

    it("should throw if the IdP configuration does not have a logout endpoint", async () => {
      const logoutHandler = getInitialisedHandler({
        storageUtility: mockStorageUtility({
          someUser: {
            issuer: "https://some.idp"
          }
        }),
        issuerConfigFetcher: mockConfigFetcher(
          IssuerConfigFetcherFetchConfigResponse
        ),
        redirector: defaultMocks.redirector
      });
      await expect(
        logoutHandler.retrieveSessionEndpoint("someUser")
      ).rejects.toThrow("[https://some.idp] does not have a logout endpoint.");
    });

    it("should return the registered logout endpoint", async () => {
      const logoutHandler = getInitialisedHandler({
        storageUtility: mockStorageUtility({
          someUser: {
            issuer: "https://some.idp"
          }
        }),
        issuerConfigFetcher: mockConfigFetcher({
          ...IssuerConfigFetcherFetchConfigResponse,
          endSessionEndpoint: new URL("https://https://some.idp/logout")
        }),
        redirector: defaultMocks.redirector
      });
      await expect(
        logoutHandler.retrieveSessionEndpoint("someUser")
      ).resolves.toEqual(new URL("https://https://some.idp/logout"));
    });
  });

  describe("handle", () => {
    it("should clear the local storage (both secure and not secure) when logging out", async () => {
      const nonEmptyStorage = mockStorageUtility({
        someUser: { someKey: "someValue" }
      });
      nonEmptyStorage.setForUser(
        "someUser",
        { someKey: "someValue" },
        { secure: true }
      );
      const logoutHandler = getInitialisedHandler({
        storageUtility: nonEmptyStorage
      });
      logoutHandler.handle({ sessionId: "someUser" });
      expect(
        nonEmptyStorage.getForUser("someUser", "someKey", { secure: true })
      ).toBeUndefined;
      expect(
        nonEmptyStorage.getForUser("someUser", "someKey", { secure: false })
      ).toBeUndefined;
      // This test is only necessary until the key is stored safely
      expect(nonEmptyStorage.get("clientKey", { secure: false })).toBeUndefined;
    });

    it("should redirect the user to the logout endpoint on a hard logout", async () => {
      const redirector = defaultMocks.redirector;
      const logoutHandler = getInitialisedHandler({
        storageUtility: mockStorageUtility({
          someUser: {
            issuer: "https://some.idp"
          }
        }),
        issuerConfigFetcher: mockConfigFetcher({
          ...IssuerConfigFetcherFetchConfigResponse,
          endSessionEndpoint: new URL("https://https://some.idp/logout")
        }),
        redirector: redirector
      });
      await logoutHandler.handle({ sessionId: "someUser", soft: false });
      expect(redirector.redirect).toHaveBeenCalledWith(
        "https://https://some.idp/logout",
        {
          handleRedirect: undefined
        }
      );
    });

    it("should not redirect the user to the logout endpoint on a soft logout", async () => {
      const redirector = defaultMocks.redirector;
      const logoutHandler = getInitialisedHandler({
        storageUtility: mockStorageUtility({
          someUser: {
            issuer: "https://some.idp"
          }
        }),
        issuerConfigFetcher: mockConfigFetcher({
          ...IssuerConfigFetcherFetchConfigResponse,
          endSessionEndpoint: new URL("https://https://some.idp/logout")
        }),
        redirector: redirector
      });
      await logoutHandler.handle({ sessionId: "someUser", soft: true });
      expect(redirector.redirect).not.toHaveBeenCalledWith(
        "https://https://some.idp/logout",
        {
          handleRedirect: undefined
        }
      );
    });

    it("should not redirect the user to the logout endpoint by default", async () => {
      const redirector = defaultMocks.redirector;
      const logoutHandler = getInitialisedHandler({
        storageUtility: mockStorageUtility({
          someUser: {
            issuer: "https://some.idp"
          }
        }),
        issuerConfigFetcher: mockConfigFetcher({
          ...IssuerConfigFetcherFetchConfigResponse,
          endSessionEndpoint: new URL("https://https://some.idp/logout")
        }),
        redirector: redirector
      });
      await logoutHandler.handle({ sessionId: "someUser" });
      expect(redirector.redirect).not.toHaveBeenCalledWith(
        "https://https://some.idp/logout",
        {
          handleRedirect: undefined
        }
      );
    });
  });
});
