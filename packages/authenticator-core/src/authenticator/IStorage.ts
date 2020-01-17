/**
 * Interface that various platforms should implement for their own storage implementation
 */
export default interface IStorage {
  get: (key: string) => Promise<string>
  set: (key: string, value: string) => Promise<void>
  delete: (key: string) => Promise<void>
}
