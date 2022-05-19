/*
 * Copyright 2022 Inrupt Inc.
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
 * A helper class that will validate items taken from local storage
 */
import { exportJWK } from "jose";
import IStorage from "./IStorage";
import IStorageUtility from "./IStorageUtility";
import InruptError from "../errors/InruptError";
import { ClientTypes, IClient, isValidClient } from "../login/oidc/IClient";
import { IIssuerConfig } from "../login/oidc/IIssuerConfig";
import { IIssuerConfigFetcher } from "../login/oidc/IIssuerConfigFetcher";
import { KeyPair } from "../authenticatedFetch/dpopUtils";
import { isValidUrl } from "../util/isValidUrl";
import { isObject } from "../util/isObject";

export type OidcContext = {
  issuerConfig: IIssuerConfig;
  codeVerifier?: string;
  redirectUrl?: string;
  dpop: boolean;
};

export interface IUserData {
  [key: string]: string;
}

export async function getSessionIdFromOauthState(
  storageUtility: IStorageUtility,
  oauthState: string
): Promise<string | undefined> {
  const sessionId = await storageUtility.getForUser(oauthState, "sessionId");

  if (typeof sessionId === "string") {
    return sessionId;
  }

  return undefined;
}

/**
 * Based on the provided state, this looks up contextual information stored
 * before redirecting the user to the OIDC issuer.
 * @param sessionId The state (~ correlation ID) of the OIDC request
 * @param storageUtility
 * @param configFetcher
 * @returns Information stored about the client issuing the request
 */
export async function loadOidcContextFromStorage(
  sessionId: string,
  storageUtility: IStorageUtility,
  configFetcher: IIssuerConfigFetcher
): Promise<OidcContext> {
  try {
    const [issuerIri, codeVerifier, storedRedirectIri, dpop] =
      await Promise.all([
        storageUtility.getForUser(sessionId, "issuer", {
          errorIfNull: true,
        }),
        storageUtility.getForUser(sessionId, "codeVerifier"),
        storageUtility.getForUser(sessionId, "redirectUrl"),
        storageUtility.getForUser(sessionId, "dpop", { errorIfNull: true }),
      ]);
    // Clear the code verifier, which is one-time use.
    await storageUtility.deleteForUser(sessionId, "codeVerifier");

    // Unlike openid-client, this looks up the configuration from storage
    const issuerConfig = await configFetcher.fetchConfig(issuerIri as string);

    if (
      typeof codeVerifier !== "string" ||
      typeof storedRedirectIri !== "string"
    ) {
      throw new Error(
        "non-string value stored for codeVerifier or redirectUrl"
      );
    }

    return {
      codeVerifier,
      redirectUrl: storedRedirectIri,
      issuerConfig,
      dpop: dpop === "true",
    };
  } catch (e) {
    throw new Error(
      `Failed to retrieve OIDC context from storage associated with session [${sessionId}]: ${e}`
    );
  }
}

/**
 * Stores information about the session in the provided storage. Note that not
 * all storage are equally secure, and it is strongly advised not to store either
 * the refresh token or the DPoP key in the browser's local storage.
 *
 * @param storageUtility
 * @param sessionId
 * @param webId
 * @param isLoggedIn
 * @param refreshToken
 * @param secure
 * @param dpopKey
 */
export async function saveSessionInfoToStorage(
  storageUtility: IStorageUtility,
  sessionId: string,
  webId?: string,
  isLoggedIn?: string,
  refreshToken?: string,
  secure?: boolean,
  dpopKey?: KeyPair
): Promise<void> {
  // TODO: Investigate why this does not work with a Promise.all
  if (refreshToken !== undefined) {
    await storageUtility.setForUser(sessionId, { refreshToken }, { secure });
  }
  if (webId !== undefined) {
    await storageUtility.setForUser(sessionId, { webId }, { secure });
  }
  if (isLoggedIn !== undefined) {
    await storageUtility.setForUser(sessionId, { isLoggedIn }, { secure });
  }
  if (dpopKey !== undefined) {
    await storageUtility.setForUser(
      sessionId,
      {
        publicKey: JSON.stringify(dpopKey.publicKey),
        privateKey: JSON.stringify(await exportJWK(dpopKey.privateKey)),
      },
      { secure }
    );
  }
}

// TOTEST: this does not handle all possible bad inputs for example what if it's not proper JSON
/**
 * @hidden
 */
export default class StorageUtility implements IStorageUtility {
  constructor(
    private secureStorage: IStorage,
    private insecureStorage: IStorage
  ) {}

  private getKey(userId: string): string {
    return `solidClientAuthenticationUser:${userId}`;
  }

  private getClientKey(issuer: string): string {
    return `solidClient:${issuer}`;
  }

  public async getClientDetails(issuer: string): Promise<IClient | null> {
    const key = this.getClientKey(issuer);

    // FIXME: Use sessionStorage or similar:
    const stored = await this.insecureStorage.get(key);

    // This will only be the case if we don't find a client for the given session:
    if (typeof stored !== "string") {
      // throw new InruptError(`No client stored for [${issuer}]`);
      return null;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(stored);
    } catch (err) {
      // throw new InruptError(
      //   `Data for client [${issuer}] in storage is corrupted - expected valid JSON, but got: ${stored}\n${err}`
      // );
      return null;
    }

    if (!isValidClient(parsed)) {
      // throw new InruptError(
      //   `Data for client [${issuer}] in storage is invalid`
      // );
      return null;
    }

    return parsed;
  }

  public async setClientDetails(
    issuer: string,
    details: IClient
  ): Promise<void> {
    const key = this.getClientKey(issuer);

    // FIXME: Use sessionStorage or similar:
    await this.insecureStorage.set(key, JSON.stringify(details));
  }

  public async deleteClientDetails(issuer: string): Promise<void> {
    const key = this.getClientKey(issuer);

    // FIXME: Use sessionStorage or similar:
    await this.insecureStorage.delete(key);
  }

  private async getUserData(
    userId: string,
    secure?: boolean
  ): Promise<IUserData> {
    const stored = await (secure
      ? this.secureStorage
      : this.insecureStorage
    ).get(this.getKey(userId));

    if (stored === undefined) {
      return {};
    }

    try {
      // FIXME: prevent bad retrieval due to JSON.parse resulting in `any` instead of `Record<string, string | number>`
      return JSON.parse(stored);
    } catch (err) {
      throw new InruptError(
        `Data for user [${userId}] in [${
          secure ? "secure" : "unsecure"
        }] storage is corrupted - expected valid JSON, but got: ${stored}`
      );
    }
  }

  private async setUserData(
    userId: string,
    data: IUserData,
    secure?: boolean
  ): Promise<void> {
    await (secure ? this.secureStorage : this.insecureStorage).set(
      this.getKey(userId),
      JSON.stringify(data)
    );
  }

  async get(
    key: string,
    options?: { errorIfNull?: boolean; secure?: boolean }
  ): Promise<string | undefined> {
    const value = await (options?.secure
      ? this.secureStorage
      : this.insecureStorage
    ).get(key);
    if (value === undefined && options?.errorIfNull) {
      throw new InruptError(`[${key}] is not stored`);
    }
    return value;
  }

  async set(
    key: string,
    value: string,
    options?: { secure?: boolean }
  ): Promise<void> {
    return (options?.secure ? this.secureStorage : this.insecureStorage).set(
      key,
      value
    );
  }

  async delete(key: string, options?: { secure?: boolean }): Promise<void> {
    return (options?.secure ? this.secureStorage : this.insecureStorage).delete(
      key
    );
  }

  async getForUser(
    userId: string,
    key: string,
    options?: { errorIfNull?: boolean; secure?: boolean }
  ): Promise<string | undefined> {
    const userData = await this.getUserData(userId, options?.secure);
    const storedValue = userData[key];

    let result: string | undefined = undefined;

    if (
      isObject(userData) &&
      Object.prototype.hasOwnProperty.call(userData, key) === true &&
      typeof storedValue === "string"
    ) {
      result = storedValue;
    }

    if (result === undefined && options?.errorIfNull) {
      throw new InruptError(
        `Field [${key}] for user [${userId}] is not stored`
      );
    }

    return result;
  }

  async setForUser(
    userId: string,
    values: IUserData,
    options?: { secure?: boolean }
  ): Promise<void> {
    let userData: IUserData;
    try {
      userData = await this.getUserData(userId, options?.secure);
    } catch {
      // if reading the user data throws, the data is corrupted, and we want to write over it
      userData = {};
    }

    await this.setUserData(userId, { ...userData, ...values }, options?.secure);
  }

  async deleteForUser(
    userId: string,
    key: string,
    options?: { secure?: boolean }
  ): Promise<void> {
    const userData = await this.getUserData(userId, options?.secure);
    delete userData[key];
    await this.setUserData(userId, userData, options?.secure);
  }

  async deleteAllUserData(
    userId: string,
    options?: { secure?: boolean }
  ): Promise<void> {
    await (options?.secure ? this.secureStorage : this.insecureStorage).delete(
      this.getKey(userId)
    );
  }
}
