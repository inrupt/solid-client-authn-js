/*
 * Copyright 2021 Inrupt Inc.
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
  IClientRegistrarOptions,
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
    const [
      storedClientId,
      storedClientSecret,
      // storedClientName,
    ] = await Promise.all([
      this.storageUtility.getForUser(options.sessionId, "clientId", {
        secure: false,
      }),
      this.storageUtility.getForUser(options.sessionId, "clientSecret", {
        secure: false,
      }),
      // this.storageUtility.getForUser(options.sessionId, "clientName", {
      //   // FIXME: figure out how to persist secure storage at reload
      //   secure: false,
      // }),
    ]);
    if (storedClientId) {
      return {
        clientId: storedClientId,
        clientSecret: storedClientSecret,
      };
    }
    const extendedOptions = { ...options };
    // If registration access token is stored, use that.
    extendedOptions.registrationAccessToken =
      extendedOptions.registrationAccessToken ??
      (await this.storageUtility.getForUser(
        options.sessionId,
        "registrationAccessToken"
      ));

    try {
      const registeredClient = await registerClient(
        extendedOptions,
        issuerConfig
      );
      // Save info
      const infoToSave: Record<string, string> = {
        clientId: registeredClient.clientId,
      };
      if (registeredClient.clientSecret) {
        infoToSave.clientSecret = registeredClient.clientSecret;
      }
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
      return registeredClient;
    } catch (error) {
      throw new Error(`Client registration failed: [${error.toString()}]`);
    }
  }
}
