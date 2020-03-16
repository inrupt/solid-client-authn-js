import { get, set, remove } from "local-storage";
import IStorage from "./IStorage";

export default class BrowserStorage implements IStorage {
  async get(key: string): Promise<string | null> {
    return get(key);
  }
  async set(key: string, value: string): Promise<void> {
    set(key, value);
  }
  async delete(key: string): Promise<void> {
    remove(key);
  }
}
