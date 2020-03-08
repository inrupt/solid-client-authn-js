import LocalStorage from "universal-localstorage";
import IStorage from "./IStorage";

export default class IsomorphicStorage implements IStorage {
  async get(key: string): Promise<string | null> {
    return LocalStorage.getItem(key);
  }
  async set(key: string, value: string): Promise<void> {
    LocalStorage.setItem(key, value);
  }
  async delete(key: string): Promise<void> {
    LocalStorage.removeItem(key);
  }
}
