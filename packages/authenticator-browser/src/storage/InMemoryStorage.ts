import IStorage from '@solid/authenticator-core/dist/authenticator/IStorage'
import { get, set, remove } from 'local-storage'

export default class InMemoryStorage implements IStorage {

  async get (key: string): Promise<string | undefined> {
    return get(key)
  }

  async set (key: string, value: string): Promise<void> {
    set(key, value)
  }

  async delete (key: string): Promise<void> {
    remove(key)
  }
}
