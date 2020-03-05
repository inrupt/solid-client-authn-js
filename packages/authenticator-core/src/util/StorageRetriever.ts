/**
 * A helper class that will validate items taken from local storage
 */
import { injectable, inject } from "tsyringe";
import IStorage from "../authenticator/IStorage";
import validateSchema from "./validateSchema";

export interface IStorageRetriever {
  /**
   * Retrieve from local storage
   * @param key The key of the item
   * @param options.schema The schema it should follow. If it does not follow this schema, it will
   * be deleted
   * @param options.postProcess A function that can be applied after the item is retrieved
   */
  /* eslint-disable @typescript-eslint/no-explicit-any */
  retrieve(
    key: string,
    options?: Partial<{
      //
      schema?: Record<string, any>;
      postProcess?: (retrievedObject: any) => any;
    }>
  ): Promise<any | null>;
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

@injectable()
export default class StorageRetriever implements IStorageRetriever {
  constructor(@inject("storage") private storage: IStorage) {}

  async retrieve(
    key: string,
    options: {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      schema?: Record<string, any>;
      postProcess?: (retrievedObject: any) => any;
    } = {}
  ): Promise<any | null> {
    /* eslint-enable @typescript-eslint/no-explicit-any */
    // Check if key is stored locally
    const locallyStored: string | undefined = await this.storage.get(key);

    // If it is stored locally, check the validity of the value
    if (locallyStored) {
      try {
        const parsedObject = JSON.parse(locallyStored);
        if (options.schema) {
          validateSchema(options.schema, parsedObject, { throwError: true });
        }
        if (options.postProcess) {
          return options.postProcess(parsedObject);
        }
        return parsedObject;
      } catch (err) {
        await this.storage.delete(key);
      }
    }
    return null;
  }
}
