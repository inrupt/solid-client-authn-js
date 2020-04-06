import IStorage from "./IStorage";

export default class NodeStorage implements IStorage {
  private map: Record<string, string> = {};
  async get(key: string): Promise<string | null> {
    return this.map[key] || null;
  }
  async set(key: string, value: string): Promise<void> {
    console.log("SETTING VIA NODE STORAGE");
    this.map[key] = value;
  }
  async delete(key: string): Promise<void> {
    delete this.map[key];
  }
}
