/**
 * In memory storage compatible with NodeJS
 */
import IStorage from "@solid/authenticator-core/dist/authenticator/IStorage";

export default class InMemoryStorage implements IStorage {
  private map: { [key: string]: string } = {};

  async get(key: string): Promise<string | undefined> {
    return this.map[key];
  }

  async set(key: string, value: string): Promise<void> {
    this.map[key] = value;
  }

  async delete(key: string): Promise<void> {
    delete this.map[key];
  }
}
