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

// Required by TSyringe:
import "reflect-metadata";
import { StorageMock } from "../../src/storage/__mocks__/Storage";
import StorageUtility from "../../src/storage/StorageUtility";

describe("StorageUtility", () => {
  const defaultMocks = {
    storage: StorageMock
  };
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
      const storageMock = defaultMocks.storage;
      storageMock.get.mockReturnValueOnce(Promise.resolve("cool"));
      const storageUtility = getStorageUtility({ storage: storageMock });
      const value = await storageUtility.get("key");
      expect(storageMock.get).toHaveBeenCalledWith("key");
      expect(value).toBe("cool");
    });

    it("returns undefined if the item is not in storage", async () => {
      const storageMock = defaultMocks.storage;
      storageMock.get.mockReturnValueOnce(Promise.resolve(undefined));
      const storageUtility = getStorageUtility({ storage: storageMock });
      const value = await storageUtility.get("key");
      expect(storageMock.get).toHaveBeenCalledWith("key");
      expect(value).toBeUndefined();
    });

    it("throws an error if the item is not in storage and errorOnNull is true", async () => {
      const storageMock = defaultMocks.storage;
      storageMock.get.mockReturnValueOnce(Promise.resolve(undefined));
      const storageUtility = getStorageUtility({ storage: storageMock });
      await expect(
        storageUtility.get("key", { errorIfNull: true })
      ).rejects.toThrowError("[key] is not stored");
    });
  });

  describe("set", () => {
    it("sets an item in storage", async () => {
      const storageUtility = getStorageUtility();
      await storageUtility.set("key", "value");
      expect(defaultMocks.storage.set).toHaveBeenCalledWith("key", "value");
    });
  });

  describe("delete", () => {
    it("deletes an item", async () => {
      const storageUtility = getStorageUtility();
      await storageUtility.delete("key");
      expect(defaultMocks.storage.delete).toHaveBeenCalledWith("key");
    });
  });

  describe("getForUser", () => {
    it("gets an item from storage for a user", async () => {
      const storageMock = defaultMocks.storage;
      const userData = {
        jackie: "The Cat",
        sledge: "The Dog"
      };
      storageMock.get.mockReturnValueOnce(
        Promise.resolve(JSON.stringify(userData))
      );
      const storageUtility = getStorageUtility({ storage: storageMock });
      const value = await storageUtility.getForUser("animals", "jackie");
      expect(storageMock.get).toHaveBeenCalledWith(
        "solidClientAuthnUser:animals"
      );
      expect(value).toBe("The Cat");
    });

    it("returns undefined if no item is in storage", async () => {
      const storageMock = defaultMocks.storage;
      storageMock.get.mockReturnValueOnce(Promise.resolve(undefined));
      const storageUtility = getStorageUtility({ storage: storageMock });
      const value = await storageUtility.getForUser("animals", "jackie");
      expect(storageMock.get).toHaveBeenCalledWith(
        "solidClientAuthnUser:animals"
      );
      expect(value).toBeUndefined();
    });

    it("returns null if the item in storage is corrupted", async () => {
      const storageMock = defaultMocks.storage;
      storageMock.get.mockReturnValueOnce(
        Promise.resolve('{ cool: "bleep bloop not parsable')
      );
      const storageUtility = getStorageUtility({ storage: storageMock });
      const value = await storageUtility.getForUser("animals", "jackie");
      expect(storageMock.get).toHaveBeenCalledWith(
        "solidClientAuthnUser:animals"
      );
      expect(value).toBe(undefined);
    });

    it("throws an error if the item is not in storage and errorOnNull is true", async () => {
      const storageMock = defaultMocks.storage;
      storageMock.get.mockReturnValueOnce(Promise.resolve(undefined));
      const storageUtility = getStorageUtility({ storage: storageMock });
      await expect(
        storageUtility.getForUser("animals", "jackie", { errorIfNull: true })
      ).rejects.toThrowError("Field [jackie] for user [animals] is not stored");
    });
  });

  describe("setForUser", () => {
    it("sets a value for a user", async () => {
      const storageMock = defaultMocks.storage;
      const userData = {
        jackie: "The Cat",
        sledge: "The Dog"
      };
      storageMock.get.mockReturnValueOnce(
        Promise.resolve(JSON.stringify(userData))
      );
      const storageUtility = getStorageUtility({ storage: storageMock });
      await storageUtility.setForUser("animals", {
        jackie: "The Pretty Kitty"
      });
      expect(storageMock.get).toHaveBeenCalledWith(
        "solidClientAuthnUser:animals"
      );
      expect(storageMock.set).toHaveBeenCalledWith(
        "solidClientAuthnUser:animals",
        JSON.stringify({
          jackie: "The Pretty Kitty",
          sledge: "The Dog"
        })
      );
    });

    it("sets a value for a user if the original data was corrupted", async () => {
      const storageMock = defaultMocks.storage;
      storageMock.get.mockReturnValueOnce(
        Promise.resolve('{ cool: "bleep bloop not parsable')
      );
      const storageUtility = getStorageUtility({ storage: storageMock });
      await storageUtility.setForUser("animals", {
        jackie: "The Pretty Kitty"
      });
      expect(storageMock.get).toHaveBeenCalledWith(
        "solidClientAuthnUser:animals"
      );
      expect(storageMock.set).toHaveBeenCalledWith(
        "solidClientAuthnUser:animals",
        JSON.stringify({
          jackie: "The Pretty Kitty"
        })
      );
    });
  });

  describe("deleteForUser", () => {
    it("deletes a value for a user", async () => {
      const storageMock = defaultMocks.storage;
      const userData = {
        jackie: "The Cat",
        sledge: "The Dog"
      };
      storageMock.get.mockReturnValueOnce(
        Promise.resolve(JSON.stringify(userData))
      );
      const storageUtility = getStorageUtility({ storage: storageMock });
      await storageUtility.deleteForUser("animals", "jackie");
      expect(storageMock.get).toHaveBeenCalledWith(
        "solidClientAuthnUser:animals"
      );
      expect(storageMock.set).toHaveBeenCalledWith(
        "solidClientAuthnUser:animals",
        JSON.stringify({
          sledge: "The Dog"
        })
      );
    });
  });

  describe("deleteAllUserData", () => {
    it("deletes all data for a particular user", async () => {
      const storageMock = defaultMocks.storage;
      const storageUtility = getStorageUtility({ storage: storageMock });
      await storageUtility.deleteAllUserData("animals");
      expect(storageMock.delete).toHaveBeenCalledWith(
        "solidClientAuthnUser:animals"
      );
    });
  });

  describe("safeGet", () => {
    it("should correctly retrieve valid data from the given storage", async () => {
      defaultMocks.storage.get.mockReturnValueOnce(
        Promise.resolve(JSON.stringify({ some: "data" }))
      );
      const storageUtility = getStorageUtility();
      await expect(storageUtility.safeGet("key")).resolves.toEqual({
        some: "data"
      });
    });

    it("should fetch data using the given key", async () => {
      const storageUtility = getStorageUtility();
      await storageUtility.safeGet("some key");
      expect(defaultMocks.storage.get.mock.calls).toEqual([["some key"]]);
    });

    it("should return null if data could not be found in the given storage", async () => {
      defaultMocks.storage.get.mockReturnValueOnce(Promise.resolve(undefined));
      const storageUtility = getStorageUtility();
      const retrieved = await storageUtility.safeGet("arbitrary key");
      expect(retrieved).toBeUndefined();
    });

    it("should validate the data from the storage if passed a schema", async () => {
      defaultMocks.storage.get.mockReturnValueOnce(
        Promise.resolve(JSON.stringify({ some: "data" }))
      );
      const schema = {
        type: "object",
        properties: {
          some: { type: "string" }
        }
      };
      const storageUtility = getStorageUtility();
      expect(
        await storageUtility.safeGet("arbitrary key", {
          schema
        })
      ).toMatchObject({ some: "data" });
    });

    it("should invalidate bad data from the storage if passed a schema and remove it from stroage", async () => {
      defaultMocks.storage.get.mockReturnValueOnce(
        Promise.resolve(JSON.stringify({ some: 1 }))
      );
      const schema = {
        type: "object",
        properties: {
          some: { type: "string" }
        }
      };
      const storageUtility = getStorageUtility();
      expect(
        await storageUtility.safeGet("arbitrary key", {
          schema
        })
      ).toBeUndefined();
      expect(defaultMocks.storage.delete).toHaveBeenCalledWith("arbitrary key");
    });

    it("gets an item for a user if a user id is passed in", async () => {
      defaultMocks.storage.get.mockReturnValueOnce(
        Promise.resolve(JSON.stringify({ key: '{ "some": "data" }' }))
      );
      const storageUtility = getStorageUtility();
      await expect(
        storageUtility.safeGet("key", { userId: "global" })
      ).resolves.toMatchObject({ some: "data" });
    });

    it("should reject and delete for corrupted user specific values", async () => {
      defaultMocks.storage.get.mockReturnValueOnce(
        Promise.resolve(
          JSON.stringify({
            key: '{ "some": "notice this does not have a closing quote }'
          })
        )
      );
      const storageUtility = getStorageUtility();
      const val = await storageUtility.safeGet("key", { userId: "global" });
      expect(val).toBeUndefined();
    });
  });
});
