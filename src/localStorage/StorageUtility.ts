/**
 * A helper class that will validate items taken from local storage
 */
import { injectable, inject } from "tsyringe";
import IStorage from "../localStorage/IStorage";
import validateSchema from "../util/validateSchema";

export interface IStorageUtility {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  getForUser(userId: string, key: string): Promise<string | null>;
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
  constructor(@inject("storage") private storage: IStorage) {}

  private getKey(userId: string): string {
    return `solidAuthFetcherUser:${userId}`;
  }

  private async getUserData(userId: string): Promise<Record<string, string>> {
    const stored = await this.storage.get(this.getKey(userId));
    if (stored === null) {
      return {};
    }
    return JSON.parse(stored);
  }

  private async setUserData(
    userId: string,
    data: Record<string, string>
  ): Promise<void> {
    await this.storage.set(this.getKey(userId), JSON.stringify(data));
  }

  async get(key: string): Promise<string | null> {
    return this.storage.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    return this.storage.set(key, value);
  }

  async delete(key: string): Promise<void> {
    return this.storage.delete(key);
  }

  async getForUser(userId: string, key: string): Promise<string | null> {
    const userData = await this.getUserData(userId);
    if (!userData[key]) {
      return null;
    }
    return userData[key];
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
    await this.storage.delete(this.getKey(userId));
  }

  async safeGet(
    key: string,
    options: {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      schema?: Record<string, any>;
      userId?: string;
    } = {}
  ): Promise<any | null> {
    /* eslint-enable @typescript-eslint/no-explicit-any */
    // Check if key is stored locally
    const locallyStored: string | null = options.userId
      ? await this.getForUser(options.userId, key)
      : await this.get(key);

    // If it is stored locally, check the validity of the value
    if (locallyStored) {
      try {
        const parsedObject = JSON.parse(locallyStored);
        if (options.schema) {
          validateSchema(options.schema, parsedObject);
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
