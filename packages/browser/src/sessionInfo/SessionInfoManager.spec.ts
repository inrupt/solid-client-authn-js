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

import {
  mockStorageUtility,
  StorageUtility,
  mockStorage,
} from "@inrupt/solid-client-authn-core";
import { jest, it, describe, expect } from "@jest/globals";

import { UuidGeneratorMock } from "../util/__mocks__/UuidGenerator";
import { LogoutHandlerMock } from "../logout/__mocks__/LogoutHandler";
import { SessionInfoManager } from "./SessionInfoManager";

const mockClearFunction = jest.fn();

jest.mock("@inrupt/oidc-client-ext", () => {
  return {
    clearOidcPersistentStorage: async () => mockClearFunction(),
  };
});

describe("SessionInfoManager", () => {
  const defaultMocks = {
    uuidGenerator: UuidGeneratorMock,
    logoutHandler: LogoutHandlerMock,
    storageUtility: mockStorageUtility({}),
  };

  function getSessionInfoManager(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): SessionInfoManager {
    const sessionManager = new SessionInfoManager(
      mocks.storageUtility ?? defaultMocks.storageUtility
    );
    return sessionManager;
  }

  describe("update", () => {
    it("is not implemented yet", async () => {
      const sessionManager = getSessionInfoManager();
      await expect(async () =>
        sessionManager.update("commanderCool", {})
      ).rejects.toThrow("Not Implemented");
    });
  });

  describe("register", () => {
    it("is not implemented yet", async () => {
      const sessionManager = getSessionInfoManager();
      await expect(async () =>
        sessionManager.register("commanderCool")
      ).rejects.toThrow("Not implemented");
    });
  });

  describe("getRegisteredSessionIdAll", () => {
    it("is not implemented yet", async () => {
      const sessionManager = getSessionInfoManager();
      await expect(async () =>
        sessionManager.getRegisteredSessionIdAll()
      ).rejects.toThrow("Not implemented");
    });
  });

  describe("clearAll", () => {
    it("is not implemented yet", async () => {
      const sessionManager = getSessionInfoManager();
      await expect(async () => sessionManager.clearAll()).rejects.toThrow(
        "Not implemented"
      );
    });
  });

  describe("get", () => {
    it("retrieves a session from specified storage", async () => {
      const sessionId = "commanderCool";

      const webId = "https://zoomies.com/commanderCool#me";

      const storageMock = new StorageUtility(
        mockStorage({
          [`solidClientAuthenticationUser:${sessionId}`]: {
            webId,
            isLoggedIn: "true",
            refreshToken: "some refresh token",
          },
        }),
        mockStorage({
          [`solidClientAuthenticationUser:${sessionId}`]: {
            clientId: "https://some.app/registration",
            clientSecret: "some client secret",
            redirectUrl: "https://some.redirect/url",
            issuer: "https://some.issuer",
            tokenType: "DPoP",
          },
        })
      );

      const sessionManager = getSessionInfoManager({
        storageUtility: storageMock,
      });
      const session = await sessionManager.get(sessionId);
      expect(session).toStrictEqual({
        sessionId,
        webId,
        isLoggedIn: true,
        clientAppId: "https://some.app/registration",
        clientAppSecret: "some client secret",
        issuer: "https://some.issuer",
        refreshToken: "some refresh token",
        redirectUrl: "https://some.redirect/url",
        tokenType: "DPoP",
      });
    });

    it("returns undefined for the optional elements if they aren't in storage", async () => {
      const sessionId = "commanderCool";
      const storageMock = new StorageUtility(
        mockStorage({
          [`solidClientAuthenticationUser:${sessionId}`]: {
            isLoggedIn: "false",
          },
        }),
        mockStorage({})
      );

      const sessionManager = getSessionInfoManager({
        storageUtility: storageMock,
      });
      const session = await sessionManager.get(sessionId);
      expect(session).toStrictEqual({
        sessionId,
        webId: undefined,
        isLoggedIn: false,
        clientAppId: undefined,
        clientAppSecret: undefined,
        issuer: undefined,
        refreshToken: undefined,
        redirectUrl: undefined,
        tokenType: "DPoP",
      });
    });

    it("returns undefined if the specified storage does not contain the user", async () => {
      const sessionManager = getSessionInfoManager({
        storageUtility: mockStorageUtility({}, true),
      });
      const session = await sessionManager.get("commanderCool");
      expect(session).toBeUndefined();
    });

    it("retrieves internal session information from specified storage", async () => {
      const sessionId = "commanderCool";

      const webId = "https://zoomies.com/commanderCool#me";

      const storageMock = new StorageUtility(
        mockStorage({
          [`solidClientAuthenticationUser:${sessionId}`]: {
            webId,
            isLoggedIn: "true",
          },
        }),
        mockStorage({
          [`solidClientAuthenticationUser:${sessionId}`]: {
            issuer: "https://my.idp",
            tokenType: "Some arbitrary token type",
          },
        })
      );

      const sessionManager = getSessionInfoManager({
        storageUtility: storageMock,
      });
      await expect(sessionManager.get(sessionId)).rejects.toThrow(
        "Tokens of type [Some arbitrary token type] are not supported."
      );
    });

    it("throws if the stored token type isn't supported", async () => {
      const sessionId = "commanderCool";

      const webId = "https://zoomies.com/commanderCool#me";

      const storageMock = new StorageUtility(
        mockStorage({
          [`solidClientAuthenticationUser:${sessionId}`]: {
            webId,
            isLoggedIn: "true",
            refreshToken: "someToken",
          },
        }),
        mockStorage({
          [`solidClientAuthenticationUser:${sessionId}`]: {
            issuer: "https://my.idp",
          },
        })
      );

      const sessionManager = getSessionInfoManager({
        storageUtility: storageMock,
      });
      const session = await sessionManager.get(sessionId);
      expect(session).toMatchObject({
        sessionId,
        webId,
        isLoggedIn: true,
        refreshToken: "someToken",
        issuer: "https://my.idp",
      });
    });
  });

  describe("clear", () => {
    it("clears oidc data", async () => {
      const sessionManager = getSessionInfoManager({
        storageUtility: mockStorageUtility({}, true),
      });
      await sessionManager.clear("Value of sessionId doesn't matter");
      expect(mockClearFunction).toHaveBeenCalled();
    });

    it("clears local secure storage from user data", async () => {
      const mockedStorage = mockStorageUtility(
        {
          "solidClientAuthenticationUser:mySession": {
            key: "value",
          },
        },
        true
      );
      const sessionManager = getSessionInfoManager({
        storageUtility: mockedStorage,
      });
      await sessionManager.clear("mySession");
      expect(
        await mockedStorage.getForUser("mySession", "key", { secure: true })
      ).toBeUndefined();
    });

    it("clears local unsecure storage from user data", async () => {
      const mockedStorage = mockStorageUtility(
        {
          "solidClientAuthenticationUser:mySession": {
            key: "value",
          },
        },
        false
      );
      const sessionManager = getSessionInfoManager({
        storageUtility: mockedStorage,
      });
      await sessionManager.clear("mySession");
      expect(
        await mockedStorage.getForUser("mySession", "key", { secure: false })
      ).toBeUndefined();
    });

    it("clears resource server session info from local storage", async () => {
      const mockedStorage = mockStorageUtility(
        {
          "solidClientAuthenticationUser:mySession": {
            webId: "https://my.pod/profile#me",
          },
        },
        true
      );
      await mockedStorage.storeResourceServerSessionInfo(
        "https://my.pod/profile#me",
        "https://my.pod",
        10000
      );
      const sessionManager = getSessionInfoManager({
        storageUtility: mockedStorage,
      });
      await sessionManager.clear("mySession");
      expect(
        JSON.parse(
          (await mockedStorage.get("tmp-resource-server-session-info", {
            secure: false,
          })) ?? ""
        )
      ).toEqual({});
    });
  });

  describe("getAll", () => {
    it("is not implemented", async () => {
      const sessionManager = getSessionInfoManager({
        storageUtility: mockStorageUtility({}),
      });
      await expect(sessionManager.getAll).rejects.toThrow("Not implemented");
    });
  });
});
