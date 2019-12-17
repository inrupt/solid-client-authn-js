
export default interface IStorage {
  get: (key: string) => string
  set: (key: string, value: string) => void
  delete: (key: string) => void
}
