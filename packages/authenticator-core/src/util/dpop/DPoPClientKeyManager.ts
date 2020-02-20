/**
 * Generates a Client Key to be stored and used for DPoP Requests
 */
import IOIDCOptions from "../../login/oidc/IOIDCOptions";
import { inject, injectable } from "tsyringe";
import { JSONWebKey } from "jose";
import { IStorageRetriever } from "../StorageRetriever";
import jwkSchema from "./JWKSchema";
import IJoseUtility from "../../authenticator/IJoseUtility";
import IStorage from "../../authenticator/IStorage";

export interface IDPoPClientKeyManager {
  /**
   * Generates the client key and stores it in local storage
   * @param oidcOptions Issuer options to ensure the key uses a compatible algorithm
   */
  generateClientKeyIfNotAlready(oidcOptions: IOIDCOptions): Promise<void>;
  /**
   * Retreives the client key from local storage
   */
  getClientKey(): Promise<JSONWebKey | null>;
}

@injectable()
export default class DPoPClientKeyManager implements IDPoPClientKeyManager {
  constructor(
    @inject("storageRetriever") private storageRetriever: IStorageRetriever,
    @inject("joseUtility") private joseUtility: IJoseUtility,
    @inject("storage") private storage: IStorage
  ) {}

  private getLocalStorageKey() {
    return `clientKey`;
  }

  async generateClientKeyIfNotAlready(
    oidcOptions: IOIDCOptions
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
