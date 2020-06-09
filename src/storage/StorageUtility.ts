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
  get(key: string, errorIfNull?: true): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  getForUser(
    userId: string,
    key: string,
    errorIfNull?: true
  ): Promise<string | null>;
  setForUser(userId: string, key: string, value: string): Promise<void>;
  deleteForUser(userId: string, key: string): Promise<void>;
  deleteAllUserData(userId: string): Promise<void>;

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
    }>
  ): Promise<any | null>;
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

  private async getUserData(userId: string): Promise<Record<string, string>> {
    const stored = await this.secureStorage.get(this.getKey(userId));
    if (stored === null) {
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
    data: Record<string, string>
  ): Promise<void> {
    await this.secureStorage.set(this.getKey(userId), JSON.stringify(data));
  }

  async get(key: string, errorIfNull?: true): Promise<string | null> {
    const value = await this.secureStorage.get(key);
    if (value == null && errorIfNull) {
      throw new Error(`${key} is not stored`);
    }
    return value;
  }

  async set(key: string, value: string): Promise<void> {
    return this.secureStorage.set(key, value);
  }

  async delete(key: string): Promise<void> {
    return this.secureStorage.delete(key);
  }

  async getForUser(
    userId: string,
    key: string,
    errorIfNull?: true
  ): Promise<string | null> {
    const userData = await this.getUserData(userId);
    let value;
    if (!userData[key]) {
      value = null;
    }
    value = userData[key];
    if (value == null && errorIfNull) {
      throw new Error(`Field ${key} for user ${userId} is not stored`);
    }
    return value || null;
  }

  async setForUser(userId: string, key: string, value: string): Promise<void> {
    const userData = await this.getUserData(userId);
    userData[key] = value;
    await this.setUserData(userId, userData);
  }

  async deleteForUser(userId: string, key: string): Promise<void> {
    const userData = await this.getUserData(userId);
    delete userData[key];
    await this.setUserData(userId, userData);
  }

  async deleteAllUserData(userId: string): Promise<void> {
    await this.secureStorage.delete(this.getKey(userId));
  }

  async safeGet(
    key: string,
    options: {
      schema?: Record<string, unknown>;
      userId?: string;
    } = {}
  ): Promise<unknown | null> {
    // Check if key is stored locally
    const locallyStored: string | null = options.userId
      ? await this.getForUser(options.userId, key)
      : await this.get(key);

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
          await this.deleteForUser(options.userId, key);
        } else {
          await this.delete(key);
        }
      }
    }
    return null;
  }
}
