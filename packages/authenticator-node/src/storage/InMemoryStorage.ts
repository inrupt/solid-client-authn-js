/**
 * In memory storage compatible with NodeJS
 */
import IStorage from "@solid/authenticator-core/dist/authenticator/IStorage";

export default class InMemoryStorage implements IStorage {
<<<<<<< HEAD
  private map: { [key: string]: string };
=======
  private map: { [key: string]: string } = {};
>>>>>>> 4547d76... Aggregate tests work again

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
