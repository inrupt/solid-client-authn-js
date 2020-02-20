/**
 * Test for DPoPClientKeyManager
 */
import "reflect-metadata";
import StorageRetrieverMocks from "../StorageRetriever.mock";
import JoseMocks from "../../authenticator/JoseUtitlity.mock";
import StorageMocks from "../../authenticator/Storage.mock";
import DPoPClientKeyManager from "../../../src/util/dpop/DPoPClientKeyManager";
import IOIDCOptions from "../../../src/login/oidc/IOIDCOptions";
import OIDCHandlerCanHandleTests from "../../login/oidc/oidcHandlers/OIDCHandlerCanHandleTests";

describe("DPoPClientKeyManager", () => {
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  function initMocks(storageResponse: unknown) {
    const storageRetrieverMocks = StorageRetrieverMocks(storageResponse);
    const joseMocks = JoseMocks();
    const storageMocks = StorageMocks();
    const dPoPClientKeyManager = new DPoPClientKeyManager(
      storageRetrieverMocks.StorageRetrieverMock(),
      joseMocks.JoseUtilityMock(),
      storageMocks.StorageMock()
    );
    return {
      ...storageRetrieverMocks,
      ...joseMocks,
      ...storageMocks,
      dPoPClientKeyManager
    };
  }

  describe("generateClientKeyIfNotAlready", () => {
    // Right now this doesn't matter, so we hard code it
    const hardCodedOIDCOptions: IOIDCOptions =
      OIDCHandlerCanHandleTests["legacyImplicitFlowOIDCHandler"][0].oidcOptions;

    it("should generate a key and save it if one does not exist", async () => {
      const mocks = initMocks(null);
      await mocks.dPoPClientKeyManager.generateClientKeyIfNotAlready(
        hardCodedOIDCOptions
      );
      expect(mocks.StorageMockSetFunction).toHaveBeenCalledWith(
        "clientKey",
        JSON.stringify(mocks.JoseUtilityMockGenerateJWKResponse)
      );
    });

    it("should not generate a client key and save it if one already exists", async () => {
      const mocks = initMocks({ kty: "RSA" });
      await mocks.dPoPClientKeyManager.generateClientKeyIfNotAlready(
        hardCodedOIDCOptions
      );
      expect(mocks.StorageMockSetFunction).not.toHaveBeenCalled();
    });
  });

  describe("getClientKey", () => {
    it("should return the saved client key", async () => {
      const savedKey = { kty: "RSA" };
      const mocks = initMocks(savedKey);
      const clientKey = await mocks.dPoPClientKeyManager.getClientKey();
      expect(clientKey).toBe(savedKey);
    });
  });
});
