//
// Copyright Inrupt Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
// Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

/**
 * @hidden
 * @packageDocumentation
 */

import type {
  IStorageUtility,
  IClientRegistrar,
  IIssuerConfig,
  IClient,
  IClientRegistrarOptions,
} from "@inrupt/solid-client-authn-core";
import { isKnownClientType } from "@inrupt/solid-client-authn-core";
import { registerClient } from "@inrupt/oidc-client-ext";

/**
 * @hidden
 */
export default class ClientRegistrar implements IClientRegistrar {
  constructor(private storageUtility: IStorageUtility) {
    this.storageUtility = storageUtility;
  }

  async getClient(
    options: IClientRegistrarOptions,
    issuerConfig: IIssuerConfig,
  ): Promise<IClient> {
    // If client secret and/or client id are stored in storage, use those.
    const [
      storedClientId,
      storedClientSecret,
      expiresAt,
      storedClientName,
      storedClientType,
    ] = await Promise.all([
      this.storageUtility.getForUser(options.sessionId, "clientId", {
        secure: false,
      }),
      this.storageUtility.getForUser(options.sessionId, "clientSecret", {
        secure: false,
      }),
      this.storageUtility.getForUser(options.sessionId, "expiresAt", {
        secure: false,
      }),
      this.storageUtility.getForUser(options.sessionId, "clientName", {
        secure: false,
      }),
      this.storageUtility.getForUser(options.sessionId, "clientType", {
        secure: false,
      }),
    ]);
    // -1 is used as a default to identify legacy cases when a value should
    // have been stored, but wasn't. It will be treated as an expired client.
    const expirationDate =
      expiresAt !== undefined ? Number.parseInt(expiresAt, 10) : -1;
    // Expiration is only applicable to confidential clients.
    // If the client registration never expires, then the expirationDate is 0.
    // Note that Date.now() is in milliseconds, and expirationDate in seconds.
    const expired =
      storedClientSecret !== undefined &&
      expirationDate !== 0 &&
      Math.floor(Date.now() / 1000) > expirationDate;
    if (storedClientId && isKnownClientType(storedClientType) && !expired) {
      return storedClientSecret !== undefined
        ? {
            clientId: storedClientId,
            clientSecret: storedClientSecret,
            clientName: storedClientName,
            // Note: static clients are not applicable in a browser context.
            clientType: "dynamic",
            expiresAt: expirationDate,
          }
        : ({
            clientId: storedClientId,
            clientName: storedClientName,
            // Note: static clients are not applicable in a browser context.
            clientType: storedClientType,
            // The type assertion is required even though the type should match the declaration.
          } as IClient);
    }

    try {
      const registeredClient = await registerClient(options, issuerConfig);
      // Save info
      const infoToSave: Record<string, string> = {
        clientId: registeredClient.clientId,
        clientType: "dynamic",
      };
      if (registeredClient.clientSecret !== undefined) {
        infoToSave.clientSecret = registeredClient.clientSecret;
        infoToSave.expiresAt = String(registeredClient.expiresAt);
      }
      if (registeredClient.idTokenSignedResponseAlg) {
        infoToSave.idTokenSignedResponseAlg =
          registeredClient.idTokenSignedResponseAlg;
      }
      await this.storageUtility.setForUser(options.sessionId, infoToSave, {
        // FIXME: figure out how to persist secure storage at reload
        // Otherwise, the client info cannot be retrieved from storage, and
        // the lib tries to re-register the client on each fetch
        secure: false,
      });
      return registeredClient;
    } catch (error) {
      throw new Error(`Client registration failed.`, { cause: error });
    }
  }
}
