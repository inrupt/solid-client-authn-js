/**
 * Generates a Client Key to be stored and used for DPoP Requests
 */
import IOidcOptions from "../login/oidc/IOidcOptions";
import { inject, injectable } from "tsyringe";
import { JSONWebKey } from "jose";
import jwkSchema from "./JwkSchema";
import IJoseUtility from "../jose/IJoseUtility";
import { IStorageUtility } from "../localStorage/StorageUtility";

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
    @inject("storageUtility") private storageUtility: IStorageUtility,
    @inject("joseUtility") private joseUtility: IJoseUtility
  ) {}

  private getLocalStorageKey(): string {
    return `clientKey`;
  }

  async generateClientKeyIfNotAlready(
    oidcOptions: IOidcOptions
  ): Promise<void> {
    let jwk: JSONWebKey = (await this.storageUtility.safeGet(
      this.getLocalStorageKey(),
      { schema: jwkSchema }
    )) as JSONWebKey;

    if (!jwk) {
      // TODO: differentiate between what a server supports instead of hard coding rsa?
      jwk = await this.joseUtility.generateJWK("RSA", 2048, {
        alg: "RSA",
        use: "sig"
      });
      await this.storageUtility.set(
        this.getLocalStorageKey(),
        JSON.stringify(jwk)
      );
    }
  }

  async getClientKey(): Promise<JSONWebKey | null> {
    return (await this.storageUtility.safeGet(this.getLocalStorageKey(), {
      schema: jwkSchema
    })) as JSONWebKey;
  }
}
