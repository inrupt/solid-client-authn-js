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

import { IStorageUtility } from "../StorageUtility";

export const StorageUtilityGetResponse = "getResponse";
export const StorageUtilitySafeGetResponse = {
  someKey: "someValue"
};

export const StorageUtilityMock: jest.Mocked<IStorageUtility> = {
  get: jest.fn(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async (key: string, options: { errorIfNull?: boolean }) =>
      StorageUtilityGetResponse
  ),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  set: jest.fn(async (key: string, value: string) => {
    /* do nothing */
  }),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  delete: jest.fn(async (key: string) => {
    /* do nothing */
  }),
  getForUser: jest.fn(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async (userId: string, key: string, options: { errorIfNull?: true }) =>
      StorageUtilityGetResponse
  ),
  /* eslint-disable @typescript-eslint/no-unused-vars */
  setForUser: jest.fn(
    async (
      userId: string,
      values: Record<string, string>,
      options?: { secure?: boolean }
    ) => {
      /* do nothing */
    }
  ),
  /* eslint-disable @typescript-eslint/no-unused-vars */
  deleteForUser: jest.fn(async (userId: string, key: string) => {
    /* do nothing */
  }),
  deleteAllUserData: jest.fn(async (userId: string) => {
    /* do nothing */
  }),
  safeGet: jest.fn(
    async (
      key: string,
      options?: Partial<{
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        schema?: Record<string, any>;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        postProcess?: (retrievedObject: any) => any;
        userId?: string;
      }>
    ) => StorageUtilitySafeGetResponse
  )
};
