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

import { default as IStorageUtility } from "../IStorageUtility";

export const StorageUtilityGetResponse = "getResponse";
export const StorageUtilitySafeGetResponse = {
  someKey: "someValue",
};

export const mockUserIdStoringInvalidData =
  "Mock user testing for invalid stored data (which should be impossible)...";

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
  /* eslint-enable @typescript-eslint/no-unused-vars */
};

export const mockStorageUtility = (
  stored: Record<string, string | Record<string, string>>,
  isSecure = false
): IStorageUtility => {
  let nonSecureStore: typeof stored, secureStore: typeof stored;
  if (isSecure) {
    secureStore = { ...stored };
    nonSecureStore = {};
  } else {
    nonSecureStore = { ...stored };
    secureStore = {};
  }
  return {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    get: async (
      key: string,
      options?: { errorIfNull?: boolean; secure?: boolean }
    ): Promise<string | undefined> => {
      const store = options?.secure ? secureStore : nonSecureStore;

      if (key.endsWith(mockUserIdStoringInvalidData)) {
        return new Promise((resolve) =>
          resolve("This response deliberately cannot be parsed as JSON!")
        );
      }

      return new Promise((resolve) =>
        resolve(store[key] ? (store[key] as string) : undefined)
      );
    },
    set: async (
      key: string,
      value: string,
      options?: { secure?: boolean }
    ): Promise<void> => {
      const store = options?.secure ? secureStore : nonSecureStore;
      store[key] = value;
    },
    delete: async (
      key: string,
      options?: { secure?: boolean }
    ): Promise<void> => {
      const store = options?.secure ? secureStore : nonSecureStore;
      delete store[key];
    },
    getForUser: async (
      userId: string,
      key: string,
      options?: { errorIfNull?: boolean; secure?: boolean }
    ): Promise<string | undefined> => {
      const store = options?.secure ? secureStore : nonSecureStore;
      return store[userId]
        ? (store[userId] as Record<string, string>)[key]
        : undefined;
    },
    setForUser: async (
      userId: string,
      values: Record<string, string>,
      options?: { secure?: boolean }
    ): Promise<void> => {
      const store = options?.secure ? secureStore : nonSecureStore;
      store[userId] = values;
    },
    deleteForUser: async (
      userId: string,
      key: string,
      options?: { secure?: boolean }
    ): Promise<void> => {
      const store = options?.secure ? secureStore : nonSecureStore;
      delete (store[userId] as Record<string, string>)[key];
    },
    deleteAllUserData: async (
      userId: string,
      options?: { secure?: boolean }
    ): Promise<void> => {
      const store = options?.secure ? secureStore : nonSecureStore;
      delete store[userId];
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
    ): Promise<string | undefined> =>
      nonSecureStore[key] ? (nonSecureStore[key] as string) : undefined,
    /* eslint-enable @typescript-eslint/no-unused-vars */
  };
};
