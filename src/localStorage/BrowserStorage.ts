import IStorage from "./IStorage";

export default class BrowserStorage implements IStorage {
  async get(key: string): Promise<string | null> {
    return window.localStorage.getItem(key);
  }
  async set(key: string, value: string): Promise<void> {
    window.localStorage.setItem(key, value);
  }
  async delete(key: string): Promise<void> {
    window.localStorage.removeItem(key);
  }
}
