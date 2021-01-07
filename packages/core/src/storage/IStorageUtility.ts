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

/**
 * @hidden
 * @packageDocumentation
 */

export default interface IStorageUtility {
  get(
    key: string,
    options?: { errorIfNull?: boolean; secure?: boolean }
  ): Promise<string | undefined>;
  set(
    key: string,
    value: string,
    options?: { secure?: boolean }
  ): Promise<void>;
  delete(key: string, options?: { secure?: boolean }): Promise<void>;
  getForUser(
    userId: string,
    key: string,
    options?: { errorIfNull?: boolean; secure?: boolean }
  ): Promise<string | undefined>;
  setForUser(
    userId: string,
    values: Record<string, string>,
    options?: { secure?: boolean }
  ): Promise<void>;
  deleteForUser(
    userId: string,
    key: string,
    options?: { secure?: boolean }
  ): Promise<void>;
  deleteAllUserData(
    userId: string,
    options?: { secure?: boolean }
  ): Promise<void>;
  storeResourceServerSessionInfo(
    webId: string,
    resourceServerIri: string,
    sessionExpires: string
  ): Promise<void>;

  /**
   * Retrieve from local storage
   * @param key The key of the item
   * @param options.schema The schema it should follow. If it does not follow this schema, it will
   * be deleted
   * @param options.postProcess A function that can be applied after the item is retrieved
   */
  /* eslint-disable @typescript-eslint/no-explicit-any */
  safeGet(
    key: string,
    options?: Partial<{
      //
      schema?: Record<string, any>;
      postProcess?: (retrievedObject: any) => any;
      userId?: string;
      secure?: boolean;
    }>
  ): Promise<any | undefined>;
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
