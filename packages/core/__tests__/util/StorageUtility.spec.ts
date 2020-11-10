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

// Required by TSyringe:
import "reflect-metadata";
import StorageUtility from "../../src/storage/StorageUtility";
import { mockStorageUtility } from "../../src";

describe("StorageUtility", () => {
  const defaultMocks = {
    // storage: StorageMock,
    storage: mockStorageUtility({}),
  };

  const key = "the key";
  const value = "the value";
  const userId = "animals";

  function getStorageUtility(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): StorageUtility {
    return new StorageUtility(
      mocks.storage ?? defaultMocks.storage,
      mocks.storage ?? defaultMocks.storage
    );
  }

  describe("get", () => {
    it("gets an item from storage", async () => {
      const storageUtility = getStorageUtility({
        storage: mockStorageUtility({}),
      });
      await storageUtility.set(key, value);
      const result = await storageUtility.get(key);
      expect(result).toBe(value);
    });

    it("gets an item from (secure) storage", async () => {
      const storageUtility = getStorageUtility({
        storage: mockStorageUtility({}, true),
      });
      await storageUtility.set(key, value, { secure: true });
      const result = await storageUtility.get(key, { secure: true });
      expect(result).toBe(value);
    });

    it("returns undefined if the item is not in storage", async () => {
      const storageUtility = getStorageUtility({
        storage: mockStorageUtility({}),
      });
      const retrievedValue = await storageUtility.get("key");
      expect(retrievedValue).toBeUndefined();
    });

    it("throws an error if the item is not in storage and errorOnNull is true", async () => {
      const storageMock = defaultMocks.storage;
      const storageUtility = getStorageUtility({ storage: storageMock });
      await expect(
        storageUtility.get("key", { errorIfNull: true })
      ).rejects.toThrow("[key] is not stored");
    });
  });

  describe("set", () => {
    it("sets an item in storage", async () => {
      const storageUtility = getStorageUtility({
        storage: mockStorageUtility({}),
      });
      await storageUtility.set(key, value);
      await expect(storageUtility.get(key)).resolves.toEqual(value);
    });
  });

  describe("delete", () => {
    it("deletes an item", async () => {
      const storageUtility = getStorageUtility({
        storage: mockStorageUtility({}),
      });

      await expect(storageUtility.get(key)).resolves.toBeUndefined();
      await storageUtility.set(key, value);
      await expect(storageUtility.get(key)).resolves.toEqual(value);

      await storageUtility.delete(key);
      await expect(storageUtility.get(key)).resolves.toBeUndefined();
    });

    it("deletes an item (from secure storage)", async () => {
      const storageUtility = getStorageUtility({
        storage: mockStorageUtility({}, true),
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
      const mockedStorageUtility = mockStorageUtility({});
      mockedStorageUtility.get = jest
        .fn()
        .mockReturnValue(
          "This response deliberately cannot be parsed as JSON!"
        );
      const storageUtility = getStorageUtility({
        storage: mockedStorageUtility,
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
        storage: mockStorageUtility({}),
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
        storage: mockStorageUtility({}, true),
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
        storage: mockStorageUtility({}),
      });
      const retrievedValue = await storageUtility.getForUser(userId, "jackie");
      expect(retrievedValue).toBeUndefined();
    });

    it("returns null if the item in storage is corrupted", async () => {
      const storageUtility = getStorageUtility({
        storage: mockStorageUtility({}),
      });
      await storageUtility.setForUser(userId, {
        cool: "bleep bloop not parsable",
      });
      const retrievedValue = await storageUtility.getForUser(userId, "jackie");
      expect(retrievedValue).toBeUndefined();
    });

    it("throws an error if the item is not in storage and errorOnNull is true", async () => {
      const storageUtility = getStorageUtility({
        storage: mockStorageUtility({}),
      });
      await expect(
        storageUtility.getForUser(userId, "jackie", { errorIfNull: true })
      ).rejects.toThrow(`Field [jackie] for user [${userId}] is not stored`);
    });
  });

  describe("setForUser", () => {
    it("sets a value for a user", async () => {
      const storageUtility = getStorageUtility({
        storage: mockStorageUtility({}),
      });
      await storageUtility.setForUser(userId, {
        jackie: "The Pretty Kitty",
      });

      const retrievedValue = await storageUtility.getForUser(userId, "jackie");
      expect(retrievedValue).toBe("The Pretty Kitty");
    });

    it("sets a value for a user if the original data was corrupted", async () => {
      const storageMock = defaultMocks.storage;
      await storageMock.setForUser(userId, {
        cool: "bleep bloop not parsable",
      });

      const storageUtility = getStorageUtility({ storage: storageMock });
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
        storage: mockStorageUtility({}),
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
        storage: mockStorageUtility({
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
        storage: mockStorageUtility({}),
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
        storage: mockStorageUtility({}, true),
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

  describe("safeGet", () => {
    it("should correctly retrieve valid data from the given storage", async () => {
      const storageUtility = getStorageUtility({
        storage: mockStorageUtility({}),
      });

      const jsonData = '   {   "jsonKey":   "some json value"   }';
      await storageUtility.set(key, jsonData);
      const result = await storageUtility.safeGet(key);
      expect(result).toEqual({ jsonKey: "some json value" });
    });

    it("should return null if data could not be found in the given storage", async () => {
      const storageUtility = getStorageUtility({
        storage: mockStorageUtility({}),
      });
      const retrieved = await storageUtility.safeGet("arbitrary key");
      expect(retrieved).toBeUndefined();
    });

    it("should validate the data from the storage if passed a schema", async () => {
      const storageUtility = getStorageUtility({
        storage: mockStorageUtility({}),
      });

      const jsonData = '   {   "jsonKey":   "some json value"   }';
      await storageUtility.set(key, jsonData);

      const schema = {
        type: "object",
        properties: {
          jsonKey: { type: "string" },
        },
      };

      const result = await storageUtility.safeGet(key, {
        schema,
      });
      expect(result).toEqual({ jsonKey: "some json value" });
    });

    it("should throw in case of schema mismatch", async () => {
      const storageUtility = getStorageUtility({
        storage: mockStorageUtility({}),
      });

      const jsonData = JSON.stringify({ jsonKey: "some json value" });
      await storageUtility.set(key, jsonData);

      const schema = {
        type: "object",
        properties: {
          jsonKey: { type: "boolean" },
        },
      };

      const result = storageUtility.safeGet(key, {
        schema,
      });
      await expect(result).rejects.toThrow("does not match expected schema");
    });

    it("should throw in case of schema mismatch for user data", async () => {
      const storageUtility = getStorageUtility({
        storage: mockStorageUtility(
          {
            "solidClientAuthenticationUser:someUser": {
              jsonKey: "some json value",
            },
          },
          false
        ),
      });

      const schema = {
        type: "object",
        properties: {
          jsonKey: { type: "boolean" },
        },
      };

      const result = storageUtility.safeGet("jsonKey", {
        schema,
        userId: "someUser",
        secure: false,
      });
      await expect(async () => result).rejects.toThrow(
        "does not match expected schema"
      );
    });

    it("gets an item for a user if a user id is passed in", async () => {
      const storageUtility = getStorageUtility({
        storage: mockStorageUtility({}),
      });

      await storageUtility.setForUser(userId, {
        [key]: '   {   "jsonKey":   "some json value"   }',
      });

      const result = await storageUtility.safeGet(key, { userId });
      expect(result).toEqual({ jsonKey: "some json value" });
    });
  });
});
