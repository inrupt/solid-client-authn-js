/**
 * Test for DPoPClientKeyManager
 */
import "reflect-metadata";
import { StorageRetrieverMock } from "../../../src/util/__mocks__/StorageRetriever";
import {
  JoseUtilityMock,
  JoseUtilityMockGenerateJWKResponse
} from "../../../src/authenticator/__mocks__/JoseUtitlity";
import { StorageMock } from "../../../src/authenticator/__mocks__/Storage";
import DpopClientKeyManager from "../../../src/util/dpop/DpopClientKeyManager";
import IOidcOptions from "../../../src/login/oidc/IOidcOptions";
import OidcHandlerCanHandleTests from "../../login/oidc/oidcHandlers/OidcHandlerCanHandleTests";

describe("DpopClientKeyManager", () => {
  const defaultMocks = {
    joseUtility: JoseUtilityMock,
    storageRetriever: StorageRetrieverMock,
    storage: StorageMock
  };
  function getDpopClientKeyManager(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): DpopClientKeyManager {
    const dpopClientKeyManager = new DpopClientKeyManager(
      mocks.storageRetriever ?? defaultMocks.storageRetriever,
      mocks.joseUtility ?? defaultMocks.joseUtility,
      mocks.storage ?? defaultMocks.storage
    );
    return dpopClientKeyManager;
  }

  describe("generateClientKeyIfNotAlready", () => {
    // Right now this doesn't matter, so we hard code it
    const hardCodedOidcOptions: IOidcOptions =
      OidcHandlerCanHandleTests["legacyImplicitFlowOidcHandler"][0].oidcOptions;

    it("should generate a key and save it if one does not exist", async () => {
      const storageRetrieverMock = StorageRetrieverMock;
      storageRetrieverMock.retrieve.mockReturnValueOnce(Promise.resolve(null));
      const storageMock = StorageMock;
      const dpopClientKeyManager = getDpopClientKeyManager({
        storageRetriever: storageRetrieverMock,
        storage: storageMock
      });

      await dpopClientKeyManager.generateClientKeyIfNotAlready(
        hardCodedOidcOptions
      );

      expect(storageMock.set).toHaveBeenCalledWith(
        "clientKey",
        JSON.stringify(JoseUtilityMockGenerateJWKResponse)
      );
    });

    it("should not generate a client key and save it if one already exists", async () => {
      const storageRetrieverMock = StorageRetrieverMock;
      storageRetrieverMock.retrieve.mockReturnValueOnce(
        Promise.resolve({ kty: "RSA" })
      );
      const storageMock = StorageMock;
      const dpopClientKeyManager = getDpopClientKeyManager({
        storageRetriever: storageRetrieverMock,
        storage: storageMock
      });

      await dpopClientKeyManager.generateClientKeyIfNotAlready(
        hardCodedOidcOptions
      );

      expect(storageMock.set).not.toHaveBeenCalled();
    });
  });

  describe("getClientKey", () => {
    it("should return the saved client key", async () => {
      const savedKey = { kty: "RSA" };
      const storageRetrieverMock = StorageRetrieverMock;
      storageRetrieverMock.retrieve.mockReturnValueOnce(
        Promise.resolve(savedKey)
      );
      const dpopClientKeyManager = getDpopClientKeyManager({
        storageRetriever: storageRetrieverMock
      });

      const clientKey = await dpopClientKeyManager.getClientKey();

      expect(clientKey).toBe(savedKey);
    });
  });
});
