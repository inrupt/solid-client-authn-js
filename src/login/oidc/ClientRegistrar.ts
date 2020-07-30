/**
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

import { inject, injectable } from "tsyringe";
import { IFetcher } from "../../util/Fetcher";
import IClient from "./IClient";
import IIssuerConfig from "./IIssuerConfig";
import { IStorageUtility } from "../../storage/StorageUtility";
import URL from "url-parse";

export interface IRegistrarOptions {
  sessionId: string;
  clientId?: string;
  clientSecret?: string;
  clientName?: string;
  redirectUrl?: URL;
}

export interface IClientRegistrar {
  getClient(
    options: IRegistrarOptions,
    issuerConfig: IIssuerConfig
  ): Promise<IClient>;
}

@injectable()
export default class ClientRegistrar implements IClientRegistrar {
  constructor(
    @inject("fetcher") private fetcher: IFetcher,
    @inject("storageUtility") private storageUtility: IStorageUtility
  ) {}

  async getClient(
    options: IRegistrarOptions,
    issuerConfig: IIssuerConfig
  ): Promise<IClient> {
    // If client secret and/or client id are in options, use those
    if (options.clientId) {
      return {
        clientId: options.clientId,
        clientSecret: options.clientSecret
      };
    }

    // If client secret and/or client id are stored in storage, use those
    const [storedClientId, storedClientSecret] = await Promise.all([
      this.storageUtility.getForUser(options.sessionId, "clientId", {
        secure: true
      }),
      this.storageUtility.getForUser(options.sessionId, "clientSecret", {
        secure: true
      })
    ]);
    if (storedClientId) {
      return {
        clientId: storedClientId,
        clientSecret: storedClientSecret
      };
    }

    // If registration access token is stored, use that
    const [registrationAccessToken, registrationClientUri] = await Promise.all([
      this.storageUtility.getForUser(
        options.sessionId,
        "registrationAccessToken"
      ),
      this.storageUtility.getForUser(options.sessionId, "registrationClientUri")
    ]);

    let registerResponse: Response;
    if (registrationAccessToken && registrationClientUri) {
      registerResponse = await this.fetcher.fetch(registrationClientUri, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${registrationAccessToken}`
        }
      });
    } else {
      // Else, begin the dynamic registration.
      const config = {
        /* eslint-disable @typescript-eslint/camelcase */
        client_name: options.clientName,
        application_type: "web",
        redirect_uris: [options.redirectUrl?.toString()],
        subject_type: "pairwise",
        token_endpoint_auth_method: "client_secret_basic",
        code_challenge_method: "S256"
        /* eslint-enable @typescript-eslint/camelcase */
      };
      if (!issuerConfig.registrationEndpoint) {
        throw new Error(
          "Dynamic Registration could not be completed because the issuer has no registration endpoint."
        );
      }
      registerResponse = await this.fetcher.fetch(
        issuerConfig.registrationEndpoint,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(config)
        }
      );
    }

    if (!registerResponse.ok) {
      throw new Error(
        `Login Registration Error: ${await registerResponse.text()}`
      );
    }
    const responseBody = await registerResponse.json();

    // Save info
    await this.storageUtility.setForUser(
      options.sessionId,
      {
        clientId: responseBody.client_id,
        clientSecret: responseBody.client_secret
      },
      {
        secure: true
      }
    );
    await this.storageUtility.setForUser(options.sessionId, {
      registrationAccessToken: responseBody.registration_access_token,
      registrationClientUri: responseBody.registration_client_uri
    });

    return {
      clientId: responseBody.client_id,
      clientSecret: responseBody.client_secret
    };
  }
}
