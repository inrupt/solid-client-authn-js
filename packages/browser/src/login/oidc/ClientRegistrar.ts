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

import {
  IStorageUtility,
  IClientRegistrar,
  IIssuerConfig,
  IClient,
  IClientDetails,
  IClientRegistrarOptions,
  isValidUrl,
} from "@inrupt/solid-client-authn-core";
import { registerClient } from "@inrupt/oidc-client-ext";

/**
 * @hidden
 */
export default class ClientRegistrar implements IClientRegistrar {
  constructor(private storageUtility: IStorageUtility) {}

  async getClient(
    options: IClientRegistrarOptions,
    issuerConfig: IIssuerConfig
  ): Promise<IClient> {
    // If client secret and/or client id are stored in storage, use those.
    const [storedClientId, storedClientSecret, storedClientExpiry] =
      await Promise.all([
        this.storageUtility.getForUser(options.sessionId, "clientId", {
          secure: false,
        }),
        this.storageUtility.getForUser(options.sessionId, "clientSecret", {
          secure: false,
        }),
        this.storageUtility.getForUser(options.sessionId, "clientExpiresAt", {
          secure: false,
        }),
      ]);

    // Handle public client identifiers:
    if (typeof storedClientId === "string" && isValidUrl(storedClientId)) {
      return {
        clientId: storedClientId,
        clientExpiresAt: 0,
        clientType: "solid-oidc",
      };
    }

    // Handle dynamically registered clients & client credentials:
    if (
      typeof storedClientId === "string" &&
      typeof storedClientSecret === "string" &&
      typeof storedClientExpiry === "number"
    ) {
      if (storedClientExpiry === 0 || storedClientExpiry > Date.now()) {
        return {
          clientId: storedClientId,
          clientSecret: storedClientSecret,
          clientExpiresAt: storedClientExpiry,
          clientType: "dynamic",
        };
      }
    }

    const extendedOptions = { ...options };

    // If registration access token is stored, use that.
    if (typeof extendedOptions.registrationAccessToken !== "string") {
      const storedRegistrationAccessToken =
        await this.storageUtility.getForUser(
          options.sessionId,
          "registrationAccessToken"
        );

      if (typeof storedRegistrationAccessToken === "string") {
        extendedOptions.registrationAccessToken = storedRegistrationAccessToken;
      }
    }

    const registeredClient = await registerClient(
      extendedOptions,
      issuerConfig
    );

    let clientExpiresAt = 0;
    if (typeof registeredClient.clientExpiresAt === "number") {
      // clientExpiresAt is the timestamp in seconds, convert it to milliseconds:
      clientExpiresAt = registeredClient.clientExpiresAt * 1000;
    }

    // Save info
    const infoToSave: IClientDetails = {
      clientId: registeredClient.clientId,
    };

    if (registeredClient.clientSecret) {
      infoToSave.clientSecret = registeredClient.clientSecret;
      // For a dynamic client, this will be an epoch > 0, for static, it should be 0:
      infoToSave.clientExpiresAt = clientExpiresAt;
    }

    // FIXME: correctly negotiate signing algorithm like node does:
    if (registeredClient.idTokenSignedResponseAlg) {
      infoToSave.idTokenSignedResponseAlg =
        registeredClient.idTokenSignedResponseAlg;
    }

    await this.storageUtility.setForUser(
      extendedOptions.sessionId,
      infoToSave,
      {
        // FIXME: figure out how to persist secure storage at reload
        // Otherwise, the client info cannot be retrieved from storage, and
        // the lib tries to re-register the client on each fetch
        secure: false,
      }
    );

    // FIXME: return a simple object like node does:
    return registeredClient;
  }
}
