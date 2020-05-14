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

/**
 * Handles Common Oidc login functions (Like fetching the configuration)
 */

import { injectable, inject } from "tsyringe";
import ILoginHandler from "../ILoginHandler";
import ILoginOptions from "../ILoginOptions";
import IOidcHandler from "./IOidcHandler";
import IOidcOptions from "./IOidcOptions";
import ConfigurationError from "../../errors/ConfigurationError";
import { IIssuerConfigFetcher } from "./IssuerConfigFetcher";
import IIssuerConfig from "./IIssuerConfig";
import { IDpopClientKeyManager } from "../../dpop/DpopClientKeyManager";
import URL from "url-parse";
import ISolidSession from "../../solidSession/ISolidSession";
import { IStorageUtility } from "../../localStorage/StorageUtility";
import { IClientRegistrar } from "./ClientRegistrar";

@injectable()
export default class OidcLoginHandler implements ILoginHandler {
  constructor(
    @inject("oidcHandler") private oidcHandler: IOidcHandler,
    @inject("issuerConfigFetcher")
    private issuerConfigFetcher: IIssuerConfigFetcher,
    @inject("dpopClientKeyManager")
    private dpopClientKeyManager: IDpopClientKeyManager,
    @inject("storageUtility") private storageUtility: IStorageUtility,
    @inject("clientRegistrar") private clientRegistrar: IClientRegistrar
  ) {}

  checkOptions(options: ILoginOptions): Error | null {
    if (!options.oidcIssuer || !options.redirect) {
      return new ConfigurationError("OidcLoginHandler requires an oidcIssuer");
    }
    return null;
  }

  async canHandle(options: ILoginOptions): Promise<boolean> {
    return !this.checkOptions(options);
  }

  async handle(options: ILoginOptions): Promise<ISolidSession> {
    // Check to ensure the login options are correct
    const optionsError: Error | null = this.checkOptions(options);
    if (optionsError) {
      throw optionsError;
    }

    // Fetch OpenId Config
    const issuerConfig: IIssuerConfig = await this.issuerConfigFetcher.fetchConfig(
      // TODO: fix this with interface
      options.oidcIssuer as URL
    );

    // Construct OIDC Options
    const OidcOptions: IOidcOptions = {
      issuer: options.oidcIssuer as URL,
      // TODO: differentiate if DPoP should be true
      dpop: true,
      // TODO: This constrains this library to browsers. Figure out what to do with redirect
      redirectUrl: options.redirect as URL,
      issuerConfiguration: issuerConfig,
      client: await this.clientRegistrar.getClient(options, issuerConfig),
      localUserId: options.localUserId,
      doNotAutoRedirect: options.doNotAutoRedirect
    };

    // Generate DPoP Key if needed
    // TODO: should be a conditional if DPoP is needed or not
    await this.dpopClientKeyManager.generateClientKeyIfNotAlready(OidcOptions);

    // Call proper OIDC Handler
    return await this.oidcHandler.handle(OidcOptions);
  }
}
