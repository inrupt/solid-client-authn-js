/**
 * Generates a Client Key to be stored and used for DPoP Requests
 */
import IOidcOptions from "../../login/oidc/IOidcOptions";
import { inject, injectable } from "tsyringe";
import { JSONWebKey } from "jose";
import { IStorageRetriever } from "../StorageRetriever";
import jwkSchema from "./JwkSchema";
import IJoseUtility from "../../authenticator/IJoseUtility";
import IStorage from "../../authenticator/IStorage";

export interface IDpopClientKeyManager {
  /**
   * Generates the client key and stores it in local storage
   * @param oidcOptions Issuer options to ensure the key uses a compatible algorithm
   */
  generateClientKeyIfNotAlready(oidcOptions: IOidcOptions): Promise<void>;
  /**
   * Retreives the client key from local storage
   */
  getClientKey(): Promise<JSONWebKey | null>;
}

@injectable()
export default class DpopClientKeyManager implements IDpopClientKeyManager {
  constructor(
    @inject("storageRetriever") private storageRetriever: IStorageRetriever,
    @inject("joseUtility") private joseUtility: IJoseUtility,
    @inject("storage") private storage: IStorage
  ) {}

  private getLocalStorageKey(): string {
    return `clientKey`;
  }

  async generateClientKeyIfNotAlready(
    oidcOptions: IOidcOptions
  ): Promise<void> {
    let jwk: JSONWebKey = (await this.storageRetriever.retrieve(
      this.getLocalStorageKey(),
      { schema: jwkSchema }
    )) as JSONWebKey;

    if (!jwk) {
      // TODO: differentiate between what a server supports instead of hard coding rsa?
      jwk = await this.joseUtility.generateJWK("RSA", 256, {
        alg: "RSA",
        use: "sig"
      });
      await this.storage.set(this.getLocalStorageKey(), JSON.stringify(jwk));
    }
  }

  async getClientKey(): Promise<JSONWebKey | null> {
    return (await this.storageRetriever.retrieve(this.getLocalStorageKey(), {
      schema: jwkSchema
    })) as JSONWebKey;
  }
}
