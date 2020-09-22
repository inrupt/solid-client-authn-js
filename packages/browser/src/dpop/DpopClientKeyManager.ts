/*
 * Copyright 2020 Inrupt Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * @hidden
 * @packageDocumentation
 */

/**
 * Generates a Client Key to be stored and used for DPoP Requests
 */
import { inject, injectable } from "tsyringe";
import { JSONWebKey } from "jose";
import jwkSchema from "./JwkSchema";
import IJoseUtility from "../jose/IJoseUtility";
import { IStorageUtility } from "@inrupt/solid-client-authn-core";

/**
 * @hidden
 */
export interface IDpopClientKeyManager {
  /**
   * Generates the client key and stores it in local storage
   * @param oidcOptions Issuer options to ensure the key uses a compatible algorithm
   */
  generateClientKeyIfNotAlready(): Promise<void>;
  /**
   * Retreives the client key from local storage
   */
  getClientKey(): Promise<JSONWebKey | undefined>;
}

/**
 * @hidden
 */
@injectable()
export default class DpopClientKeyManager implements IDpopClientKeyManager {
  constructor(
    @inject("storageUtility") private storageUtility: IStorageUtility,
    @inject("joseUtility") private joseUtility: IJoseUtility
  ) {}

  public static getLocalStorageKey(): string {
    // TODO unimplemented ???
    return `clientKey`;
  }

  async generateClientKeyIfNotAlready(): Promise<void> {
    let jwk: JSONWebKey = (await this.storageUtility.safeGet(
      DpopClientKeyManager.getLocalStorageKey(),
      { schema: jwkSchema }
    )) as JSONWebKey;

    if (!jwk) {
      // TODO: differentiate between what a server supports instead of hard coding rsa?
      jwk = await this.joseUtility.generateJWK("EC", "P-256", {
        alg: "EC",
        use: "sig",
      });

      // FIXME: Temporarily use insecure storage while the implicit auth flow is required.
      await this.storageUtility.set(
        DpopClientKeyManager.getLocalStorageKey(),
        JSON.stringify(jwk),
        // FIXME: implicit flow fails if the DPoP key is stored in the "secure" storage.
        { secure: false }
      );
    }
  }

  async getClientKey(): Promise<JSONWebKey | undefined> {
    let keyString;

    // FIXME: Temporarily use insecure storage while the implicit auth flow is required.
    try {
      keyString = await this.storageUtility.get(
        DpopClientKeyManager.getLocalStorageKey(),
        {
          secure: false,
        }
      );
      if (!keyString) {
        return undefined;
      }
      return JSON.parse(keyString) as JSONWebKey;
    } catch (err) {
      throw new Error(`The stored token [${keyString}] was invalid: ${err}.`);
    }
  }
}
