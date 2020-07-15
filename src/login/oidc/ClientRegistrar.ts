/**
 * This project is a continuation of Inrupt's awesome solid-auth-fetcher project,
 * see https://www.npmjs.com/package/@inrupt/solid-auth-fetcher.
 * Copyright 2020 The Solid Project.
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
import ILoginOptions from "../ILoginOptions";
import IIssuerConfig from "./IIssuerConfig";

export interface IClientRegistrar {
  getClient(
    options: ILoginOptions,
    issuerConfig: IIssuerConfig
  ): Promise<IClient>;
}

@injectable()
export default class ClientRegistrar implements IClientRegistrar {
  constructor(@inject("fetcher") private fetcher: IFetcher) {}

  private async performDynamicRegistration(
    options: ILoginOptions,
    issuerConfig: IIssuerConfig
  ): Promise<IClient> {
    const config = {
      /* eslint-disable @typescript-eslint/camelcase */
      client_name: options.clientName,
      application_type: "web",
      redirect_uris: [options.redirect?.toString()],
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
    const response = await this.fetcher.fetch(
      issuerConfig.registrationEndpoint,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(config)
      }
    );
    if (!response.ok) {
      throw new Error(`Login Registration Error: ${await response.text()}`);
    }
    const responseBody = await response.json();
    return {
      clientId: responseBody.client_id,
      clientSecret: responseBody.client_secret
    };
  }

  async getClient(
    options: ILoginOptions,
    issuerConfig: IIssuerConfig
  ): Promise<IClient> {
    // Do dynamic registration
    if (!options.clientId) {
      return await this.performDynamicRegistration(options, issuerConfig);
    }
    // No need for dynamic registration
    return {
      clientId: options.clientId
    };
  }
}
