import IStorage from "./IStorage";

export default class BrowserStorage implements IStorage {
  async get(key: string): Promise<string | null> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    return window.localStorage.getItem(key);
  }
  async set(key: string, value: string): Promise<void> {
    console.log("SETTING STORAGE");
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    window.localStorage.setItem(key, value);
  }
  async delete(key: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    window.localStorage.removeItem(key);
  }
}
