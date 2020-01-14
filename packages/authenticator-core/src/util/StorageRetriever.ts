import { injectable, inject } from 'tsyringe'
import IStorage from '../authenticator/IStorage'
import validateSchema from './validateSchema'

export interface IStorageRetriever {
  retrieve (
    key: string,
    schema?: Object,
    postProcess?: (retrievedObject: Object) => Object
  ): Promise<Object>
}

@injectable()
export default class StorageRetriever implements IStorageRetriever {
  constructor (
    @inject('storage') private storage: IStorage
  ) {}

  async retrieve (
    key: string,
    schema?: Object,
    postProcess?: (retrievedObject: Object) => Object
  ): Promise<Object | null> {
    // Check if key is stored locally
    const locallyStored: string | null =
      await this.storage.get(key)

    // If it is stored locally, check the validity of the value
    if (locallyStored) {
      try {
        const parsedObject = JSON.parse(locallyStored)
        if (schema) {
          validateSchema(schema, parsedObject, true)
        }
        if (postProcess) {
          return postProcess(parsedObject)
        }
        return parsedObject
      } catch (err) {
        await this.storage.delete(key)
      }
    }
    return null
  }
}
