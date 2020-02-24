/**
 * Test for DPoPClientKeyManager
 */
import "reflect-metadata";
import StorageRetrieverMocks from "../../../src/util/__mocks__/StorageRetriever";
import JoseMocks from "../../../src/authenticator/__mocks__/JoseUtitlity";
import StorageMocks from "../../../src/authenticator/__mocks__/Storage";
import DpopClientKeyManager from "../../../src/util/dpop/DpopClientKeyManager";
import IOidcOptions from "../../../src/login/oidc/IOidcOptions";
import OidcHandlerCanHandleTests from "../../login/oidc/oidcHandlers/OidcHandlerCanHandleTests";

describe("DpopClientKeyManager", () => {
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  function initMocks(storageResponse: unknown) {
    const storageRetrieverMocks = StorageRetrieverMocks(storageResponse);
    const joseMocks = JoseMocks();
    const storageMocks = StorageMocks();
    const dpopClientKeyManager = new DpopClientKeyManager(
      storageRetrieverMocks.StorageRetrieverMock(),
      joseMocks.JoseUtilityMock(),
      storageMocks.StorageMock
    );
    return {
      ...storageRetrieverMocks,
      ...joseMocks,
      ...storageMocks,
      dpopClientKeyManager
    };
  }

  describe("generateClientKeyIfNotAlready", () => {
    // Right now this doesn't matter, so we hard code it
    const hardCodedOidcOptions: IOidcOptions =
      OidcHandlerCanHandleTests["legacyImplicitFlowOidcHandler"][0].oidcOptions;

    it("should generate a key and save it if one does not exist", async () => {
      const mocks = initMocks(null);
      await mocks.dpopClientKeyManager.generateClientKeyIfNotAlready(
        hardCodedOidcOptions
      );
      expect(mocks.StorageMockSetFunction).toHaveBeenCalledWith(
        "clientKey",
        JSON.stringify(mocks.JoseUtilityMockGenerateJWKResponse)
      );
    });

    it("should not generate a client key and save it if one already exists", async () => {
      const mocks = initMocks({ kty: "RSA" });
      await mocks.dpopClientKeyManager.generateClientKeyIfNotAlready(
        hardCodedOidcOptions
      );
      expect(mocks.StorageMockSetFunction).not.toHaveBeenCalled();
    });
  });

  describe("getClientKey", () => {
    it("should return the saved client key", async () => {
      const savedKey = { kty: "RSA" };
      const mocks = initMocks(savedKey);
      const clientKey = await mocks.dpopClientKeyManager.getClientKey();
      expect(clientKey).toBe(savedKey);
    });
  });
});
