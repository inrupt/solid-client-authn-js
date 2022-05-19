/*
 * Copyright 2022 Inrupt Inc.
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

import StorageUtility from "../StorageUtility";
import type IStorage from "../IStorage";
import type IStorageUtility from "../IStorageUtility";
import { IClient } from "../../login/oidc/IClient";

export const StorageUtilityGetResponse = "getResponse";

export const StorageUtilityClientResponse: IClient = {
  clientType: "solid-oidc",
  clientId: "https://example.test/",
};

export const StorageUtilityMock: IStorageUtility = {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  get: async (key: string, options?: { errorIfNull?: boolean }) =>
    StorageUtilityGetResponse,
  set: async (key: string, value: string) => {
    /* do nothing */
  },
  delete: async (key: string) => {
    /* do nothing */
  },

  getClientDetails: async (issuer: string): Promise<IClient> => {
    return StorageUtilityClientResponse;
  },

  setClientDetails: async (issuer: string, details: IClient): Promise<void> => {
    /* do nothing */
  },

  deleteClientDetails: async (issuer: string): Promise<void> => {
    /* do nothing */
  },

  getForUser: async (
    userId: string,
    key: string,
    options?: { errorIfNull?: boolean; secure?: boolean }
  ) => {
    return StorageUtilityGetResponse;
  },

  setForUser: async (
    userId: string,
    values: Record<string, string>,
    options?: { secure?: boolean }
  ) => {
    /* do nothing */
  },

  deleteForUser: async (
    userId: string,
    key: string,
    options?: { secure?: boolean }
  ) => {
    /* do nothing */
  },

  deleteAllUserData: async (userId: string, options?: { secure?: boolean }) => {
    /* do nothing */
  },
};

export const mockStorage = (
  stored: Record<string, string | Record<string, string | number>>
): IStorage => {
  const store = Object.keys(stored).reduce<Record<string, string>>(
    // Have to use spread here due to eslint no-reassign-param
    (mockStore, key) => {
      const value = stored[key];
      if (typeof value === "string") {
        return {
          ...mockStore,
          [key]: value,
        };
      }
      return {
        ...mockStore,
        [key]: JSON.stringify(value),
      };
    },
    {}
  );

  return {
    get: async (key: string): Promise<string | undefined> => {
      if (store[key] === undefined) {
        return undefined;
      }
      if (typeof store[key] === "string") {
        return store[key] as string;
      }
      return store[key];
    },
    set: async (key: string, value: string): Promise<void> => {
      store[key] = value;
    },
    delete: async (key: string): Promise<void> => {
      delete store[key];
    },
  };
};

export const mockStorageUtility = (
  stored: Record<string, string | Record<string, string | number>>,
  isSecure = false
): IStorageUtility => {
  if (isSecure) {
    return new StorageUtility(mockStorage(stored), mockStorage({}));
  }
  return new StorageUtility(mockStorage({}), mockStorage(stored));
};
