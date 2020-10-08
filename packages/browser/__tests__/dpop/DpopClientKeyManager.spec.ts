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

/**
 * Test for DPoPClientKeyManager
 */
import "reflect-metadata";
import {
  mockStorageUtility,
  StorageUtilityMock,
} from "@inrupt/solid-client-authn-core";
import DpopClientKeyManager from "../../src/dpop/DpopClientKeyManager";

describe("DpopClientKeyManager", () => {
  const defaultMocks = {
    storageUtility: StorageUtilityMock,
  };

  function getDpopClientKeyManager(
    mocks: Partial<typeof defaultMocks> = defaultMocks
  ): DpopClientKeyManager {
    const dpopClientKeyManager = new DpopClientKeyManager(
      mocks.storageUtility ?? defaultMocks.storageUtility
    );

    return dpopClientKeyManager;
  }

  describe("generateClientKeyIfNotAlready", () => {
    it("should generate a key and save it if one does not exist", async () => {
      const storageMock = mockStorageUtility({});
      const dpopClientKeyManager = getDpopClientKeyManager({
        storageUtility: storageMock,
      });

      await dpopClientKeyManager.generateClientKeyIfNotAlready();

      const jwk = await storageMock.get(
        DpopClientKeyManager.getLocalStorageKey()
      );

      // We expect our JWK to be JSON stringified, but to contain specific
      // values.
      expect(jwk).toContain('kty":"EC');
      expect(jwk).toContain('alg":"ES256');
    });

    it("should not generate a client key and save it if one already exists", async () => {
      const storageKey = DpopClientKeyManager.getLocalStorageKey();
      const storageValue = "Value doesn't matter";

      const storageMock = mockStorageUtility({
        [storageKey]: storageValue,
      });

      const dpopClientKeyManager = getDpopClientKeyManager({
        storageUtility: storageMock,
      });

      await dpopClientKeyManager.generateClientKeyIfNotAlready();

      // We expect our storage to remain exactly the same (not overwritten).
      expect(storageMock.get(storageKey)).resolves.toEqual(storageValue);
    });
  });

  describe("getClientKey", () => {
    it("should return the saved client key", async () => {
      const savedKey = '{"kty":"RSA"}';
      const storageKey = DpopClientKeyManager.getLocalStorageKey();

      const dpopClientKeyManager = getDpopClientKeyManager({
        storageUtility: mockStorageUtility({
          [storageKey]: savedKey,
        }),
      });

      const clientKey = await dpopClientKeyManager.getClientKey();

      expect(JSON.stringify(clientKey)).toEqual(savedKey);
    });
  });
});
