// Required by TSyringe:
import "reflect-metadata";
import { StorageMock } from "../../src/localStorage/__mocks__/Storage";
import StorageUtility from "../../src/localStorage/StorageUtility";

/* eslint-disable @typescript-eslint/ban-ts-ignore */

describe("StorageUtility", () => {
  const defaultMocks = {
    storage: StorageMock
  };
  function getStorageUtility(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): StorageUtility {
    return new StorageUtility(mocks.storage ?? defaultMocks.storage);
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

    it("returns null if the item is not in storage", async () => {
      const storageMock = defaultMocks.storage;
      storageMock.get.mockReturnValueOnce(Promise.resolve(null));
      const storageUtility = getStorageUtility({ storage: storageMock });
      const value = await storageUtility.get("key");
      expect(storageMock.get).toHaveBeenCalledWith("key");
      expect(value).toBeNull();
    });
  });

  describe("set", () => {
    it("sets an item in storage", async () => {
      const storageUtility = getStorageUtility();
      const value = await storageUtility.set("key", "value");
      expect(defaultMocks.storage.set).toHaveBeenCalledWith("key", "value");
    });
  });

  describe("delete", () => {
    it("deletes an item", async () => {
      const storageUtility = getStorageUtility();
      const value = await storageUtility.delete("key");
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
        "solidAuthFetcherUser:animals"
      );
      expect(value).toBe("The Cat");
    });

    it("returns null if no item is in storage", async () => {
      const storageMock = defaultMocks.storage;
      storageMock.get.mockReturnValueOnce(Promise.resolve(null));
      const storageUtility = getStorageUtility({ storage: storageMock });
      const value = await storageUtility.getForUser("animals", "jackie");
      expect(storageMock.get).toHaveBeenCalledWith(
        "solidAuthFetcherUser:animals"
      );
      expect(value).toBeNull();
    });

    it("returns null if the item in storage is corrupted", async () => {
      const storageMock = defaultMocks.storage;
      const userData = {
        jackie: "The Cat",
        sledge: "The Dog"
      };
      storageMock.get.mockReturnValueOnce(
        Promise.resolve('{ cool: "bleep bloop not parsable')
      );
      const storageUtility = getStorageUtility({ storage: storageMock });
      const value = await storageUtility.getForUser("animals", "jackie");
      expect(storageMock.get).toHaveBeenCalledWith(
        "solidAuthFetcherUser:animals"
      );
      expect(value).toBe(null);
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
      const value = await storageUtility.setForUser(
        "animals",
        "jackie",
        "The Pretty Kitty"
      );
      expect(storageMock.get).toHaveBeenCalledWith(
        "solidAuthFetcherUser:animals"
      );
      expect(storageMock.set).toHaveBeenCalledWith(
        "solidAuthFetcherUser:animals",
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
      const value = await storageUtility.setForUser(
        "animals",
        "jackie",
        "The Pretty Kitty"
      );
      expect(storageMock.get).toHaveBeenCalledWith(
        "solidAuthFetcherUser:animals"
      );
      expect(storageMock.set).toHaveBeenCalledWith(
        "solidAuthFetcherUser:animals",
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
      const value = await storageUtility.deleteForUser("animals", "jackie");
      expect(storageMock.get).toHaveBeenCalledWith(
        "solidAuthFetcherUser:animals"
      );
      expect(storageMock.set).toHaveBeenCalledWith(
        "solidAuthFetcherUser:animals",
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
      const value = await storageUtility.deleteAllUserData("animals");
      expect(storageMock.delete).toHaveBeenCalledWith(
        "solidAuthFetcherUser:animals"
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
      defaultMocks.storage.get.mockReturnValueOnce(Promise.resolve(null));
      const storageUtility = getStorageUtility();
      const retrieved = await storageUtility.safeGet("arbitrary key");
      expect(retrieved).toBeNull();
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
      ).toBeNull();
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
      expect(val).toBeNull();
    });
  });
});
