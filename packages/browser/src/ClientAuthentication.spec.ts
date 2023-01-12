//
// Copyright 2022 Inrupt Inc.
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

import { jest, it, describe, expect, beforeEach } from "@jest/globals";
import { EventEmitter } from "events";
import * as SolidClientAuthnCore from "@inrupt/solid-client-authn-core";

import {
  StorageUtility,
  USER_SESSION_PREFIX,
  EVENTS,
} from "@inrupt/solid-client-authn-core";

import {
  mockStorageUtility,
  mockStorage,
  mockIncomingRedirectHandler,
  mockHandleIncomingRedirect,
} from "@inrupt/solid-client-authn-core/mocks";

import { mockLoginHandler } from "./login/__mocks__/LoginHandler";
import { mockLogoutHandler } from "./logout/__mocks__/LogoutHandler";
import {
  mockSessionInfoManager,
  SessionCreatorCreateResponse,
} from "./sessionInfo/__mocks__/SessionInfoManager";
import ClientAuthentication from "./ClientAuthentication";
import { mockDefaultIssuerConfigFetcher } from "./login/oidc/__mocks__/IssuerConfigFetcher";

jest.mock("@inrupt/solid-client-authn-core", () => {
  const actualCoreModule = jest.requireActual(
    "@inrupt/solid-client-authn-core"
  ) as typeof SolidClientAuthnCore;
  return {
    ...actualCoreModule,
    fetchJwks: jest.fn(),
  };
});

type SessionStorageOptions = {
  clientId: string;
  issuer: string;
};

const mockSessionStorage = async (
  sessionId: string,
  options: SessionStorageOptions = {
    clientId: "https://some.app/registration",
    issuer: "https://some.issuer",
  }
): Promise<StorageUtility> => {
  return new StorageUtility(
    mockStorage({
      [`${USER_SESSION_PREFIX}:${sessionId}`]: {
        isLoggedIn: "true",
        webId: "https://my.pod/profile#me",
      },
    }),
    mockStorage({
      [`${USER_SESSION_PREFIX}:${sessionId}`]: {
        clientId: options.clientId,
        issuer: options.issuer,
      },
    })
  );
};

describe("ClientAuthentication", () => {
  const defaultMockStorage = mockStorageUtility({});
  const defaultMocks = {
    loginHandler: mockLoginHandler(),
    redirectHandler: mockIncomingRedirectHandler(),
    logoutHandler: mockLogoutHandler(defaultMockStorage),
    sessionInfoManager: mockSessionInfoManager(defaultMockStorage),
    issuerConfigFetcher: mockDefaultIssuerConfigFetcher(),
  };

  function getClientAuthentication(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): ClientAuthentication {
    return new ClientAuthentication(
      mocks.loginHandler ?? defaultMocks.loginHandler,
      mocks.redirectHandler ?? defaultMocks.redirectHandler,
      mocks.logoutHandler ?? defaultMocks.logoutHandler,
      mocks.sessionInfoManager ?? defaultMocks.sessionInfoManager,
      mocks.issuerConfigFetcher ?? defaultMocks.issuerConfigFetcher
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();

    Object.defineProperty(window, "location", {
      writable: true,
      value: { assign: jest.fn() },
    });
  });

  describe("login", () => {
    const mockEmitter = new EventEmitter();
    // TODO: add tests for events & errors

    it("calls login, and uses the window.location.href for the redirect if no redirectUrl is set", async () => {
      // Set a current window location which will be the expected URL to be
      // redirected back to, since we don't pass redirectUrl:
      window.location.href = "https://coolapp.test/some/redirect";

      const clientAuthn = getClientAuthentication();
      await clientAuthn.login(
        {
          sessionId: "mySession",
          tokenType: "DPoP",
          clientId: "coolApp",
          oidcIssuer: "https://idp.com",
        },
        mockEmitter
      );
      expect(defaultMocks.loginHandler.handle).toHaveBeenCalledWith({
        sessionId: "mySession",
        clientId: "coolApp",
        redirectUrl: "https://coolapp.test/some/redirect",
        oidcIssuer: "https://idp.com",
        clientName: "coolApp",
        eventEmitter: mockEmitter,
        tokenType: "DPoP",
      });
    });

    it("calls login, and defaults to a DPoP token", async () => {
      const clientAuthn = getClientAuthentication();
      await clientAuthn.login(
        {
          sessionId: "mySession",
          tokenType: "DPoP",
          clientId: "coolApp",
          redirectUrl: "https://coolapp.com/redirect",
          oidcIssuer: "https://idp.com",
        },
        mockEmitter
      );
      expect(defaultMocks.loginHandler.handle).toHaveBeenCalledWith({
        sessionId: "mySession",
        clientId: "coolApp",
        redirectUrl: "https://coolapp.com/redirect",
        oidcIssuer: "https://idp.com",
        clientName: "coolApp",
        clientSecret: undefined,
        handleRedirect: undefined,
        eventEmitter: mockEmitter,
        tokenType: "DPoP",
      });
    });

    it("request a bearer token if specified", async () => {
      const clientAuthn = getClientAuthentication();
      await clientAuthn.login(
        {
          sessionId: "mySession",
          clientId: "coolApp",
          redirectUrl: "https://coolapp.com/redirect",
          oidcIssuer: "https://idp.com",
          tokenType: "Bearer",
        },
        mockEmitter
      );
      expect(defaultMocks.loginHandler.handle).toHaveBeenCalledWith({
        sessionId: "mySession",
        clientId: "coolApp",
        redirectUrl: "https://coolapp.com/redirect",
        oidcIssuer: "https://idp.com",
        clientName: "coolApp",
        clientSecret: undefined,
        handleRedirect: undefined,
        eventEmitter: mockEmitter,
        tokenType: "Bearer",
      });
    });

    it("should clear the local storage when logging in", async () => {
      const nonEmptyStorage = mockStorageUtility({
        someUser: { someKey: "someValue" },
      });
      await nonEmptyStorage.setForUser(
        "someUser",
        { someKey: "someValue" },
        { secure: true }
      );
      const clientAuthn = getClientAuthentication({
        sessionInfoManager: mockSessionInfoManager(nonEmptyStorage),
      });
      await clientAuthn.login(
        {
          sessionId: "someUser",
          tokenType: "DPoP",
          clientId: "coolApp",
          clientName: "coolApp Name",
          redirectUrl: "https://coolapp.com/redirect",
          oidcIssuer: "https://idp.com",
        },
        mockEmitter
      );
      await expect(
        nonEmptyStorage.getForUser("someUser", "someKey", { secure: true })
      ).resolves.toBeUndefined();
      await expect(
        nonEmptyStorage.getForUser("someUser", "someKey", { secure: false })
      ).resolves.toBeUndefined();
      // This test is only necessary until the key is stored safely
      await expect(
        nonEmptyStorage.get("clientKey", { secure: false })
      ).resolves.toBeUndefined();
    });
  });

  describe("fetch", () => {
    it("calls fetch", async () => {
      window.fetch = jest.fn<typeof fetch>();
      const clientAuthn = getClientAuthentication();
      await clientAuthn.fetch("https://html5zombo.com");
      expect(window.fetch).toHaveBeenCalledWith(
        "https://html5zombo.com",
        undefined
      );
    });
  });

  describe("logout", () => {
    const mockEmitter = new EventEmitter();
    // TODO: add tests for events & errors

    it("reverts back to un-authenticated fetch on logout", async () => {
      window.fetch = jest.fn<typeof fetch>();
      // eslint-disable-next-line no-restricted-globals
      history.replaceState = jest.fn();
      const clientAuthn = getClientAuthentication();

      const unauthFetch = clientAuthn.fetch;

      const url =
        "https://coolapp.com/redirect?state=userId&id_token=idToken&access_token=accessToken";
      await clientAuthn.handleIncomingRedirect(url, mockEmitter);

      // Calling the redirect handler should give us an authenticated fetch.
      expect(clientAuthn.fetch).not.toBe(unauthFetch);

      await clientAuthn.logout("mySession");
      const spyFetch = jest.spyOn(window, "fetch");
      await clientAuthn.fetch("https://example.com", {
        credentials: "omit",
      });
      // Calling logout should revert back to our un-authenticated fetch.
      expect(clientAuthn.fetch).toBe(unauthFetch);
      expect(spyFetch).toHaveBeenCalledWith("https://example.com", {
        credentials: "omit",
      });
    });
  });

  describe("getAllSessionInfo", () => {
    it("creates a session for the global user", async () => {
      const clientAuthn = getClientAuthentication();
      await expect(() => clientAuthn.getAllSessionInfo()).rejects.toThrow(
        "Not implemented"
      );
    });
  });

  describe("getSessionInfo", () => {
    it("creates a session for the global user", async () => {
      const sessionInfo = {
        isLoggedIn: "true",
        sessionId: "mySession",
        webId: "https://pod.com/profile/card#me",
      };
      const clientAuthn = getClientAuthentication({
        sessionInfoManager: mockSessionInfoManager(
          mockStorageUtility(
            {
              "solidClientAuthenticationUser:mySession": { ...sessionInfo },
            },
            true
          )
        ),
      });
      const session = await clientAuthn.getSessionInfo("mySession");
      // isLoggedIn is stored as a string under the hood, but deserialized as a boolean
      expect(session).toEqual({
        ...sessionInfo,
        isLoggedIn: true,
        tokenType: "DPoP",
      });
    });
  });

  describe("handleIncomingRedirect", () => {
    const mockEmitter = new EventEmitter();
    mockEmitter.emit = jest.fn<typeof mockEmitter.emit>();

    it("calls handle redirect", async () => {
      // eslint-disable-next-line no-restricted-globals
      history.replaceState = jest.fn();
      const expectedResult = SessionCreatorCreateResponse;
      const clientAuthn = getClientAuthentication();
      const unauthFetch = clientAuthn.fetch;
      const url =
        "https://coolapp.com/redirect?state=userId&id_token=idToken&access_token=accessToken";
      const redirectInfo = await clientAuthn.handleIncomingRedirect(
        url,
        mockEmitter
      );

      // Our injected mocked response may also contain internal-only data (for
      // other tests), whereas our response from `handleIncomingRedirect()` can
      // only contain publicly visible fields. So we need to explicitly check
      // for individual fields (as opposed to just checking against
      // entire-response-object-equality).
      expect(redirectInfo?.sessionId).toEqual(expectedResult.sessionId);
      expect(redirectInfo?.webId).toEqual(expectedResult.webId);
      expect(redirectInfo?.isLoggedIn).toEqual(expectedResult.isLoggedIn);
      expect(redirectInfo?.expirationDate).toEqual(
        expectedResult.expirationDate
      );
      expect(defaultMocks.redirectHandler.handle).toHaveBeenCalledWith(
        url,
        mockEmitter
      );

      // Calling the redirect handler should have updated the fetch.
      expect(clientAuthn.fetch).not.toBe(unauthFetch);
      expect(mockEmitter.emit).not.toHaveBeenCalled();
    });

    it("clears the current IRI from OAuth query parameters in the auth code flow", async () => {
      // eslint-disable-next-line no-restricted-globals
      history.replaceState = jest.fn();
      const clientAuthn = getClientAuthentication();
      const url =
        "https://coolapp.com/redirect?state=someState&code=someAuthCode&iss=someIssuer";
      await clientAuthn.handleIncomingRedirect(url, mockEmitter);
      // eslint-disable-next-line no-restricted-globals
      expect(history.replaceState).toHaveBeenCalledWith(
        null,
        "",
        "https://coolapp.com/redirect"
      );
      expect(mockEmitter.emit).not.toHaveBeenCalled();
    });

    it("clears the current IRI from OAuth query parameters even if auth flow fails", async () => {
      // eslint-disable-next-line no-restricted-globals
      history.replaceState = jest.fn();

      mockHandleIncomingRedirect.mockImplementationOnce(() =>
        Promise.reject(new Error("Something went wrong"))
      );

      const clientAuthn = getClientAuthentication();

      const url =
        "https://coolapp.com/redirect?state=someState&code=someAuthCode";
      await clientAuthn.handleIncomingRedirect(url, mockEmitter);
      // eslint-disable-next-line no-restricted-globals
      expect(history.replaceState).toHaveBeenCalledWith(
        null,
        "",
        "https://coolapp.com/redirect"
      );

      expect(mockEmitter.emit).toHaveBeenCalledWith(
        EVENTS.ERROR,
        "redirect",
        new Error("Something went wrong")
      );
    });

    it("clears the current IRI from OAuth query parameters in the implicit flow", async () => {
      // eslint-disable-next-line no-restricted-globals
      history.replaceState = jest.fn();
      const clientAuthn = getClientAuthentication();
      const url =
        "https://coolapp.com/redirect?state=someState&id_token=idToken&access_token=accessToken";
      await clientAuthn.handleIncomingRedirect(url, mockEmitter);
      // eslint-disable-next-line no-restricted-globals
      expect(history.replaceState).toHaveBeenCalledWith(
        null,
        "",
        "https://coolapp.com/redirect"
      );
      expect(mockEmitter.emit).not.toHaveBeenCalled();
    });

    it("preserves non-OAuth query strings", async () => {
      // eslint-disable-next-line no-restricted-globals
      history.replaceState = jest.fn();
      const clientAuthn = getClientAuthentication();
      const url =
        "https://coolapp.com/redirect?state=someState&code=someAuthCode&someQuery=someValue";
      await clientAuthn.handleIncomingRedirect(url, mockEmitter);
      // eslint-disable-next-line no-restricted-globals
      expect(history.replaceState).toHaveBeenCalledWith(
        null,
        "",
        "https://coolapp.com/redirect?someQuery=someValue"
      );
      expect(mockEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe("validateCurrentSession", () => {
    it("returns null if the current session has no stored issuer", async () => {
      const sessionId = "mySession";

      const mockedStorage = new StorageUtility(
        mockStorage({
          [`${USER_SESSION_PREFIX}:${sessionId}`]: {
            isLoggedIn: "true",
          },
        }),
        mockStorage({
          [`${USER_SESSION_PREFIX}:${sessionId}`]: {
            clientId: "https://some.app/registration",
          },
        })
      );
      const clientAuthn = getClientAuthentication({
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });

      await expect(
        clientAuthn.validateCurrentSession(sessionId)
      ).resolves.toBeNull();
    });

    it("returns null if the current session has no stored client ID", async () => {
      const sessionId = "mySession";
      const mockedStorage = new StorageUtility(
        mockStorage({
          [`${USER_SESSION_PREFIX}:${sessionId}`]: {
            isLoggedIn: "true",
            issuer: "https://some.issuer",
          },
        }),
        mockStorage({
          [`${USER_SESSION_PREFIX}:${sessionId}`]: {},
        })
      );
      const clientAuthn = getClientAuthentication({
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });

      await expect(
        clientAuthn.validateCurrentSession(sessionId)
      ).resolves.toBeNull();
    });

    it("returns the current session if all necessary information are available", async () => {
      const sessionId = "mySession";
      const mockedStorage = await mockSessionStorage(sessionId, {
        clientId: "https://some.app/registration",
        issuer: "https://some.issuer",
      });

      const clientAuthn = getClientAuthentication({
        sessionInfoManager: mockSessionInfoManager(mockedStorage),
      });

      await expect(
        clientAuthn.validateCurrentSession(sessionId)
      ).resolves.toStrictEqual(
        expect.objectContaining({
          issuer: "https://some.issuer",
          clientAppId: "https://some.app/registration",
          sessionId,
          webId: "https://my.pod/profile#me",
        })
      );
    });
  });
});
