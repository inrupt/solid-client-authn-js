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

/**
 * A helper class that will validate items taken from local storage
 */
import { injectable, inject } from "tsyringe";
import IStorage from "../storage/IStorage";
import validateSchema from "../util/validateSchema";

export interface IStorageUtility {
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

// TOTEST: this does not handle all possible bad inputs for example what if it's not proper JSON
@injectable()
export default class StorageUtility implements IStorageUtility {
  constructor(
    @inject("secureStorage") private secureStorage: IStorage,
    @inject("insecureStorage") private insecureStorage: IStorage
  ) {}

  private getKey(userId: string): string {
    return `solidAuthFetcherUser:${userId}`;
  }

  private async getUserData(
    userId: string,
    secure?: boolean
  ): Promise<Record<string, string>> {
    const stored = await (secure
      ? this.secureStorage
      : this.insecureStorage
    ).get(this.getKey(userId));
    if (stored === undefined) {
      return {};
    }
    try {
      return JSON.parse(stored);
    } catch (err) {
      return {};
    }
  }

  private async setUserData(
    userId: string,
    data: Record<string, string>,
    secure?: boolean
  ): Promise<void> {
    await (secure ? this.secureStorage : this.insecureStorage).set(
      this.getKey(userId),
      JSON.stringify(data)
    );
  }

  async get(
    key: string,
    options?: { errorIfNull?: boolean; secure?: boolean }
  ): Promise<string | undefined> {
    const value = await (options?.secure
      ? this.secureStorage
      : this.insecureStorage
    ).get(key);
    if (value == undefined && options?.errorIfNull) {
      throw new Error(`[${key}] is not stored`);
    }
    return value;
  }

  async set(
    key: string,
    value: string,
    options?: { secure?: boolean }
  ): Promise<void> {
    return (options?.secure ? this.secureStorage : this.insecureStorage).set(
      key,
      value
    );
  }

  async delete(key: string, options?: { secure?: boolean }): Promise<void> {
    return (options?.secure ? this.secureStorage : this.insecureStorage).delete(
      key
    );
  }

  async getForUser(
    userId: string,
    key: string,
    options?: { errorIfNull?: boolean; secure?: boolean }
  ): Promise<string | undefined> {
    const userData = await this.getUserData(userId, options?.secure);
    let value;
    if (!userData || !userData[key]) {
      value = undefined;
    }
    value = userData[key];
    if (value == undefined && options?.errorIfNull) {
      throw new Error(`Field [${key}] for user [${userId}] is not stored`);
    }
    return value || undefined;
  }

  async setForUser(
    userId: string,
    values: Record<string, string>,
    options?: { secure?: boolean }
  ): Promise<void> {
    const userData = await this.getUserData(userId, options?.secure);
    await this.setUserData(userId, { ...userData, ...values }, options?.secure);
  }

  async deleteForUser(
    userId: string,
    key: string,
    options?: { secure?: boolean }
  ): Promise<void> {
    const userData = await this.getUserData(userId, options?.secure);
    delete userData[key];
    await this.setUserData(userId, userData, options?.secure);
  }

  async deleteAllUserData(
    userId: string,
    options?: { secure?: boolean }
  ): Promise<void> {
    await (options?.secure ? this.secureStorage : this.insecureStorage).delete(
      this.getKey(userId)
    );
  }

  async safeGet(
    key: string,
    options: {
      schema?: Record<string, unknown>;
      userId?: string;
      secure?: boolean;
    } = {}
  ): Promise<unknown | undefined> {
    // Check if key is stored locally
    const locallyStored: string | undefined = options.userId
      ? await this.getForUser(options.userId, key, { secure: options.secure })
      : await this.get(key, { secure: options.secure });

    // If it is stored locally, check the validity of the value
    if (locallyStored) {
      try {
        const parsedObject = JSON.parse(locallyStored);
        if (options.schema) {
          const val = validateSchema(options.schema, parsedObject);
          return val;
        }
        return parsedObject;
      } catch (err) {
        if (options.userId) {
          await this.deleteForUser(options.userId, key, {
            secure: options.secure
          });
        } else {
          await this.delete(key, { secure: options.secure });
        }
      }
    }
    return undefined;
  }
}
