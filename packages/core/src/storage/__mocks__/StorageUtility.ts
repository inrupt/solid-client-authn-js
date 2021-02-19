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

import { IStorage, StorageUtility } from "../..";
import IStorageUtility from "../IStorageUtility";

export const StorageUtilityGetResponse = "getResponse";
export const StorageUtilitySafeGetResponse = {
  someKey: "someValue",
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
  getForUser: async (
    userId: string,
    key: string,
    options?: { errorIfNull?: boolean; secure?: boolean }
  ) => StorageUtilityGetResponse,
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
  safeGet: async (
    key: string,
    options?: Partial<{
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      schema?: Record<string, any>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      postProcess?: (retrievedObject: any) => any;
      userId?: string;
    }>
  ) => StorageUtilitySafeGetResponse,
};

export const mockStorage = (
  stored: Record<string, string | Record<string, string>>
): IStorage => {
  const store = stored;
  return {
    get: async (key: string): Promise<string | undefined> => {
      if (store[key] === undefined) {
        return undefined;
      }
      if (typeof store[key] === "string") {
        return store[key] as string;
      }
      return JSON.stringify(store[key]);
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
  stored: Record<string, string | Record<string, string>>,
  isSecure = false
): IStorageUtility => {
  if (isSecure) {
    return new StorageUtility(mockStorage(stored), mockStorage({}));
  }
  return new StorageUtility(mockStorage({}), mockStorage(stored));
};
