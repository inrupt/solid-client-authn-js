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
  fromKeyLike,
  generateKeyPair,
  KeyLike,
} from "@inrupt/jose-legacy-modules";
import { jest, describe, it, expect } from "@jest/globals";
import { mockIssuerConfig } from "../login/oidc/__mocks__/IssuerConfig";
import { mockIssuerConfigFetcher } from "../login/oidc/__mocks__/IssuerConfigFetcher";
import StorageUtility, {
  getSessionIdFromOauthState,
  loadOidcContextFromStorage,
  saveSessionInfoToStorage,
} from "./StorageUtility";
import { mockStorage, mockStorageUtility } from "./__mocks__/StorageUtility";

describe("StorageUtility", () => {
  const defaultMocks = {
    // storage: StorageMock,
    secureStorage: mockStorage({}),
    insecureStorage: mockStorage({}),
  };

  const key = "the key";
  const value = "the value";
  const userId = "animals";

  function getStorageUtility(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): StorageUtility {
    return new StorageUtility(
      mocks.secureStorage ?? defaultMocks.secureStorage,
      mocks.insecureStorage ?? defaultMocks.insecureStorage
    );
  }

  describe("get", () => {
    it("gets an item from storage", async () => {
      const storageUtility = getStorageUtility({
        insecureStorage: mockStorage({}),
      });
      await storageUtility.set(key, value);
      const result = await storageUtility.get(key);
      expect(result).toBe(value);
    });

    it("gets an item from (secure) storage", async () => {
      const storageUtility = getStorageUtility({
        secureStorage: mockStorage({}),
      });
      await storageUtility.set(key, value, { secure: true });
      const result = await storageUtility.get(key, { secure: true });
      expect(result).toBe(value);
    });

    it("returns undefined if the item is not in storage", async () => {
      const storageUtility = getStorageUtility({
        insecureStorage: mockStorage({}),
      });
      const retrievedValue = await storageUtility.get("key");
      expect(retrievedValue).toBeUndefined();
    });

    it("throws an error if the item is not in storage and errorOnNull is true", async () => {
      const storageMock = defaultMocks.insecureStorage;
      const storageUtility = getStorageUtility({
        insecureStorage: storageMock,
      });
      await expect(
        storageUtility.get("key", { errorIfNull: true })
      ).rejects.toThrow("[key] is not stored");
    });
  });

  describe("set", () => {
    it("sets an item in storage", async () => {
      const storageUtility = getStorageUtility({
        insecureStorage: mockStorage({}),
      });
      await storageUtility.set(key, value);
      await expect(storageUtility.get(key)).resolves.toEqual(value);
    });
  });

  describe("delete", () => {
    it("deletes an item", async () => {
      const storageUtility = getStorageUtility({
        insecureStorage: mockStorage({}),
      });

      await expect(storageUtility.get(key)).resolves.toBeUndefined();
      await storageUtility.set(key, value);
      await expect(storageUtility.get(key)).resolves.toEqual(value);

      await storageUtility.delete(key);
      await expect(storageUtility.get(key)).resolves.toBeUndefined();
    });

    it("deletes an item (from secure storage)", async () => {
      const storageUtility = getStorageUtility({
        insecureStorage: mockStorage({}),
      });

      await expect(
        storageUtility.get(key, { secure: true })
      ).resolves.toBeUndefined();
      await storageUtility.set(key, value, { secure: true });
      await expect(storageUtility.get(key, { secure: true })).resolves.toEqual(
        value
      );

      await storageUtility.delete(key, { secure: true });
      await expect(
        storageUtility.get(key, { secure: true })
      ).resolves.toBeUndefined();
    });
  });

  describe("getForUser", () => {
    it("throws if data stored is invalid JSON", async () => {
      const mockedStorageUtility = mockStorage({});
      mockedStorageUtility.get = jest
        .fn()
        .mockReturnValue(
          "This response deliberately cannot be parsed as JSON!"
        ) as typeof mockedStorageUtility.get;
      const storageUtility = getStorageUtility({
        insecureStorage: mockedStorageUtility,
        secureStorage: mockedStorageUtility,
      });

      await expect(
        storageUtility.getForUser("irrelevant for this test", "Doesn't matter")
      ).rejects.toThrow("cannot be parsed as JSON!");

      await expect(
        storageUtility.getForUser(
          "irrelevant for this test",
          "Doesn't matter",
          { secure: true }
        )
      ).rejects.toThrow("cannot be parsed as JSON!");
    });

    it("gets an item from storage for a user", async () => {
      const storageUtility = getStorageUtility({
        insecureStorage: mockStorage({}),
      });
      const userData = {
        jackie: "The Cat",
        sledge: "The Dog",
      };
      await storageUtility.setForUser(userId, userData);

      const retrievedValue = await storageUtility.getForUser(userId, "jackie");

      expect(retrievedValue).toBe("The Cat");
    });

    it("gets an item from (secure) storage for a user", async () => {
      const storageUtility = getStorageUtility({
        secureStorage: mockStorage({}),
      });
      const userData = {
        jackie: "The Cat",
        sledge: "The Dog",
      };
      await storageUtility.setForUser(userId, userData, {
        secure: true,
      });

      const retrievedValue = await storageUtility.getForUser(userId, "jackie", {
        secure: true,
      });

      expect(retrievedValue).toBe("The Cat");
    });

    it("returns undefined if no item is in storage", async () => {
      const storageUtility = getStorageUtility({
        insecureStorage: mockStorage({}),
      });
      const retrievedValue = await storageUtility.getForUser(userId, "jackie");
      expect(retrievedValue).toBeUndefined();
    });

    it("returns null if the item in storage is corrupted", async () => {
      const storageUtility = getStorageUtility({
        insecureStorage: mockStorage({}),
      });
      await storageUtility.setForUser(userId, {
        cool: "bleep bloop not parsable",
      });
      const retrievedValue = await storageUtility.getForUser(userId, "jackie");
      expect(retrievedValue).toBeUndefined();
    });

    it("throws an error if the item is not in storage and errorOnNull is true", async () => {
      const storageUtility = getStorageUtility({
        insecureStorage: mockStorage({}),
      });
      await expect(
        storageUtility.getForUser(userId, "jackie", { errorIfNull: true })
      ).rejects.toThrow(`Field [jackie] for user [${userId}] is not stored`);
    });
  });

  describe("setForUser", () => {
    it("sets a value for a user", async () => {
      const storageUtility = getStorageUtility({
        insecureStorage: mockStorage({}),
      });
      await storageUtility.setForUser(userId, {
        jackie: "The Pretty Kitty",
      });

      const retrievedValue = await storageUtility.getForUser(userId, "jackie");
      expect(retrievedValue).toBe("The Pretty Kitty");
    });

    it("sets a value for a user if the original data was corrupted", async () => {
      const storageMock = defaultMocks.insecureStorage;
      await storageMock.set(
        `solidClientAuthenticationUser:${userId}`,
        'cool: "bleep bloop not parsable"'
      );

      const storageUtility = getStorageUtility({
        insecureStorage: storageMock,
      });
      await storageUtility.setForUser(userId, {
        jackie: "The Pretty Kitty",
      });
      const retrievedValue = await storageUtility.getForUser(userId, "jackie");
      expect(retrievedValue).toBe("The Pretty Kitty");
    });
  });

  describe("deleteForUser", () => {
    it("deletes a value for a user from unsecure storage", async () => {
      const userData = {
        jackie: "The Cat",
        sledge: "The Dog",
      };
      const storageUtility = getStorageUtility({
        insecureStorage: mockStorage({}),
      });
      await storageUtility.setForUser(userId, userData);

      await storageUtility.deleteForUser(userId, "jackie");

      await expect(
        storageUtility.getForUser(userId, "jackie")
      ).resolves.toBeUndefined();
      await expect(
        storageUtility.getForUser(userId, "sledge")
      ).resolves.toEqual("The Dog");
    });

    it("deletes a value for a user from secure storage", async () => {
      const storageUtility = getStorageUtility({
        secureStorage: mockStorage({
          "solidClientAuthenticationUser:someUser": {
            jackie: "The Cat",
            sledge: "The Dog",
          },
        }),
      });

      await storageUtility.deleteForUser("someUser", "jackie", {
        secure: true,
      });

      await expect(
        storageUtility.getForUser("someUser", "jackie", { secure: true })
      ).resolves.toBeUndefined();
      await expect(
        storageUtility.getForUser("someUser", "sledge", { secure: true })
      ).resolves.toEqual("The Dog");
    });
  });

  describe("deleteAllUserData", () => {
    it("deletes all data for a particular user", async () => {
      const storageUtility = getStorageUtility({
        insecureStorage: mockStorage({}),
      });
      const userData = {
        jackie: "The Cat",
        sledge: "The Dog",
      };

      // Write some user data, and make sure it's there.
      await storageUtility.setForUser(userId, userData);
      await expect(
        storageUtility.getForUser(userId, "jackie")
      ).resolves.toEqual("The Cat");

      // Delete that user data, and make sure it's gone.
      await storageUtility.deleteAllUserData(userId);
      await expect(
        storageUtility.getForUser(userId, "jackie")
      ).resolves.toBeUndefined();
    });

    it("deletes all data for a particular user (from secure storage)", async () => {
      const storageUtility = getStorageUtility({
        secureStorage: mockStorage({}),
      });
      const userData = {
        jackie: "The Cat",
        sledge: "The Dog",
      };

      // Write some user data, and make sure it's there.
      await storageUtility.setForUser(userId, userData, { secure: true });
      await expect(
        storageUtility.getForUser(userId, "jackie", { secure: true })
      ).resolves.toEqual("The Cat");

      // Delete that user data, and make sure it's gone.
      await storageUtility.deleteAllUserData(userId, { secure: true });
      await expect(
        storageUtility.getForUser(userId, "jackie", { secure: true })
      ).resolves.toBeUndefined();
    });
  });

  describe("storeResourceServerSessionInfo", () => {
    it("stores session information for a new WebID", async () => {
      const storageUtility = getStorageUtility({
        insecureStorage: mockStorage({}),
      });
      await storageUtility.storeResourceServerSessionInfo(
        "https://some.pod/profile#me",
        "https://some-resource.provider/",
        1610026667
      );
      expect(
        JSON.parse(
          (await storageUtility.get("tmp-resource-server-session-info")) ?? "{}"
        )
      ).toEqual({
        webId: "https://some.pod/profile#me",
        sessions: {
          "https://some-resource.provider/": {
            expiration: 1610026667,
          },
        },
      });
    });

    it("adds a new resource server to a WebID that is already registered", async () => {
      const storageUtility = getStorageUtility({
        insecureStorage: mockStorage({
          "tmp-resource-server-session-info": JSON.stringify({
            webId: "https://some.pod/profile#me",
            sessions: {
              "https://some-other-resource.provider/": {
                expiration: 1610026667,
              },
            },
          }),
        }),
      });

      await storageUtility.storeResourceServerSessionInfo(
        "https://some.pod/profile#me",
        "https://some-resource.provider/",
        1610026667
      );
      await expect(
        storageUtility.get("tmp-resource-server-session-info")
      ).resolves.toEqual(
        JSON.stringify({
          webId: "https://some.pod/profile#me",
          sessions: {
            "https://some-other-resource.provider/": {
              expiration: 1610026667,
            },
            "https://some-resource.provider/": {
              expiration: 1610026667,
            },
          },
        })
      );
    });

    it("overwrites existing sessions when storing a session for a new WebID", async () => {
      const storageUtility = getStorageUtility({
        insecureStorage: mockStorage({
          "tmp-resource-server-session-info": JSON.stringify({
            webId: "https://some-other.pod/profile#me",
            sessions: {
              "https://some-other-resource.provider/": {
                expiration: 1610026667,
              },
            },
          }),
        }),
      });

      await storageUtility.storeResourceServerSessionInfo(
        "https://some.pod/profile#me",
        "https://some-resource.provider/",
        1610026667
      );
      await expect(
        storageUtility.get("tmp-resource-server-session-info")
      ).resolves.toEqual(
        JSON.stringify({
          webId: "https://some.pod/profile#me",
          sessions: {
            "https://some-resource.provider/": {
              expiration: 1610026667,
            },
          },
        })
      );
    });
  });

  describe("clearResourceServerSessionInfo", () => {
    it("doesn't not fail if the WebID does not exist", async () => {
      const storageUtility = getStorageUtility({
        insecureStorage: mockStorage({}),
      });
      await storageUtility.clearResourceServerSessionInfo(
        "https://some-resource.provider/"
      );
      await expect(
        storageUtility.get("tmp-resource-server-session-info")
      ).resolves.toBeUndefined();
    });

    it("clears the session info object if no session is active", async () => {
      const storageUtility = getStorageUtility({
        insecureStorage: mockStorage({
          "tmp-resource-server-session-info": JSON.stringify({
            webId: "https://some.pod/profile#me",
            sessions: {
              "https://some-resource.provider/": {
                expiration: 1610026667,
              },
            },
          }),
        }),
      });

      await storageUtility.clearResourceServerSessionInfo(
        "https://some-resource.provider/"
      );
      await expect(
        storageUtility.get("tmp-resource-server-session-info")
      ).resolves.toEqual(JSON.stringify({}));
    });

    it("removes the given resource server session info", async () => {
      const storageUtility = getStorageUtility({
        insecureStorage: mockStorage({
          "tmp-resource-server-session-info": JSON.stringify({
            webId: "https://some.pod/profile#me",
            sessions: {
              "https://some-resource.provider/": {
                expiration: 1610026667,
              },
            },
          }),
        }),
      });

      await storageUtility.clearResourceServerSessionInfo(
        "https://some-other-resource.provider/"
      );
      await expect(
        storageUtility.get("tmp-resource-server-session-info")
      ).resolves.toEqual(
        JSON.stringify({
          webId: "https://some.pod/profile#me",
          sessions: {
            "https://some-resource.provider/": {
              expiration: 1610026667,
            },
          },
        })
      );
    });
  });
});

describe("getSessionIdFromOauthState", () => {
  it("returns stored OIDC 'state' for request's OIDC 'state' value", async () => {
    const oauthState = "some existent 'state'";
    const oauthStateValue = "some existent 'state' value";
    const mockedStorage = mockStorageUtility(
      {
        [`solidClientAuthenticationUser:${oauthState}`]: {
          sessionId: oauthStateValue,
        },
      },
      false
    );

    await expect(
      getSessionIdFromOauthState(mockedStorage, oauthState)
    ).resolves.toBe(oauthStateValue);
  });

  it("returns undefined if no stored OIDC 'state' matches the current request's OIDC 'state' value", async () => {
    const mockedStorage = mockStorageUtility({});

    await expect(
      getSessionIdFromOauthState(
        mockedStorage,
        "some non-existent 'state' value"
      )
    ).resolves.toBeUndefined();
  });
});

describe("loadOidcContextFromStorage", () => {
  it("throws if no issuer is stored for the user", async () => {
    const mockedStorage = mockStorageUtility({
      "solidClientAuthenticationUser:mySession": {
        codeVerifier: "some code verifier",
        redirectUrl: "https://my.app/redirect",
        dpop: "true",
      },
    });

    await expect(
      loadOidcContextFromStorage(
        "mySession",
        mockedStorage,
        mockIssuerConfigFetcher(mockIssuerConfig())
      )
    ).rejects.toThrow(
      "Failed to retrieve OIDC context from storage associated with session [mySession]"
    );
  });

  it("throws if no token type is stored for the user", async () => {
    const mockedStorage = mockStorageUtility({
      "solidClientAuthenticationUser:mySession": {
        issuer: "https://my.idp/",
        codeVerifier: "some code verifier",
        redirectUrl: "https://my.app/redirect",
      },
    });

    await expect(
      loadOidcContextFromStorage(
        "mySession",
        mockedStorage,
        mockIssuerConfigFetcher(mockIssuerConfig())
      )
    ).rejects.toThrow(
      "Failed to retrieve OIDC context from storage associated with session [mySession]"
    );
  });

  it("Returns the value in storage if available", async () => {
    const mockedStorage = mockStorageUtility({
      "solidClientAuthenticationUser:mySession": {
        issuer: "https://my.idp/",
        codeVerifier: "some code verifier",
        redirectUrl: "https://my.app/redirect",
        dpop: "true",
      },
    });

    await expect(
      loadOidcContextFromStorage(
        "mySession",
        mockedStorage,
        mockIssuerConfigFetcher(mockIssuerConfig())
      )
    ).resolves.toEqual({
      issuerConfig: mockIssuerConfig(),
      codeVerifier: "some code verifier",
      redirectUrl: "https://my.app/redirect",
      dpop: true,
    });
  });
});

describe("saveSessionInfoToStorage", () => {
  it("saves the refresh token if provided in the given storage", async () => {
    const mockedStorage = mockStorageUtility({});
    await saveSessionInfoToStorage(
      mockedStorage,
      "some session",
      "an ID token",
      "https://my.webid",
      "true",
      "a refresh token",
      true
    );

    await expect(
      mockedStorage.getForUser("some session", "refreshToken", { secure: true })
    ).resolves.toEqual("a refresh token");
  });

  it("saves ID token if provided in the given storage", async () => {
    const mockedStorage = mockStorageUtility({});
    await saveSessionInfoToStorage(
      mockedStorage,
      "some session",
      "an ID token",
      undefined,
      undefined,
      undefined,
      true
    );

    await expect(
      mockedStorage.getForUser("some session", "idToken", { secure: true })
    ).resolves.toEqual("an ID token");
  });

  it("saves the webid if provided in the given storage", async () => {
    const mockedStorage = mockStorageUtility({});
    await saveSessionInfoToStorage(
      mockedStorage,
      "some session",
      undefined,
      "https://my.webid",
      undefined,
      undefined,
      true
    );

    await expect(
      mockedStorage.getForUser("some session", "webId", { secure: true })
    ).resolves.toEqual("https://my.webid");
  });

  it("saves the logged in status if provided in the given storage", async () => {
    const mockedStorage = mockStorageUtility({});
    await saveSessionInfoToStorage(
      mockedStorage,
      "some session",
      undefined,
      undefined,
      "true",
      undefined,
      true
    );

    await expect(
      mockedStorage.getForUser("some session", "isLoggedIn", { secure: true })
    ).resolves.toEqual("true");
  });

  let publicKey: KeyLike | undefined;
  let privateKey: KeyLike | undefined;

  const mockJwk = async (): Promise<{
    publicKey: KeyLike;
    privateKey: KeyLike;
  }> => {
    if (typeof publicKey === "undefined" || typeof privateKey === "undefined") {
      const generatedPair = await generateKeyPair("ES256");
      publicKey = generatedPair.publicKey;
      privateKey = generatedPair.privateKey;
    }
    return {
      publicKey,
      privateKey,
    };
  };

  const mockKeyPair = async () => {
    const { privateKey: prvt, publicKey: pblc } = await mockJwk();
    const dpopKeyPair = {
      privateKey: prvt,
      publicKey: await fromKeyLike(pblc),
    };
    // The alg property isn't set by fromKeyLike, so set it manually.
    dpopKeyPair.publicKey.alg = "ES256";
    return dpopKeyPair;
  };

  it("saves the DPoP key if provided in the given storage", async () => {
    const mockedStorage = mockStorageUtility({});
    const dpopKey = await mockKeyPair();
    await saveSessionInfoToStorage(
      mockedStorage,
      "some session",
      "an ID token",
      "https://my.webid",
      "true",
      "a refresh token",
      true,
      dpopKey
    );

    expect(
      JSON.parse(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        (await mockedStorage.getForUser("some session", "publicKey", {
          secure: true,
        }))!
      )
    ).toEqual(dpopKey.publicKey);
    const privateJwk = await mockedStorage.getForUser(
      "some session",
      "privateKey",
      { secure: true }
    );
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(JSON.parse(privateJwk!)).toEqual(
      await fromKeyLike(dpopKey.privateKey)
    );
  });
});
