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

/**
 * Handles Common Oidc login functions (Like fetching the configuration)
 */

import { injectable, inject } from "tsyringe";
import {
  IClientRegistrar,
  IIssuerConfig,
  IIssuerConfigFetcher,
  ILoginOptions,
  ILoginHandler,
  IOidcHandler,
  IOidcOptions,
  IStorageUtility,
  ConfigurationError,
  LoginResult,
  handleRegistration,
} from "@inrupt/solid-client-authn-core";

function hasIssuer(
  options: ILoginOptions
): options is ILoginOptions & { oidcIssuer: string } {
  return typeof options.oidcIssuer === "string";
}

function hasRedirectUrl(
  options: ILoginOptions
): options is ILoginOptions & { redirectUrl: string } {
  return typeof options.redirectUrl === "string";
}

/**
 * @hidden
 */
@injectable()
export default class OidcLoginHandler implements ILoginHandler {
  constructor(
    @inject("browser:storageUtility") private storageUtility: IStorageUtility,
    @inject("browser:oidcHandler") private oidcHandler: IOidcHandler,
    @inject("browser:issuerConfigFetcher")
    private issuerConfigFetcher: IIssuerConfigFetcher,
    @inject("browser:clientRegistrar") private clientRegistrar: IClientRegistrar
  ) {}

  async canHandle(options: ILoginOptions): Promise<boolean> {
    return hasIssuer(options) && hasRedirectUrl(options);
  }

  async handle(options: ILoginOptions): Promise<LoginResult> {
    if (!hasIssuer(options)) {
      throw new ConfigurationError(
        `OidcLoginHandler requires an OIDC issuer: missing property 'oidcIssuer' in ${JSON.stringify(
          options
        )}`
      );
    }
    if (!hasRedirectUrl(options)) {
      throw new ConfigurationError(
        `OidcLoginHandler requires a redirect URL: missing property 'redirectUrl' in ${JSON.stringify(
          options
        )}`
      );
    }

    // Fetch issuer config.
    const issuerConfig: IIssuerConfig =
      await this.issuerConfigFetcher.fetchConfig(options.oidcIssuer);

    const clientRegistration = await handleRegistration(
      options,
      issuerConfig,
      this.storageUtility,
      this.clientRegistrar
    );

    // Construct OIDC Options
    const OidcOptions: IOidcOptions = {
      // Note that here, the issuer is not the one from the received options, but
      // from the issuer's config. This enforces the canonical URL is used and stored,
      // which is also the one present in the ID token, so storing a technically
      // valid, but different issuer URL (e.g. using a trailing slash or not) now
      // could prevent from validating the ID token later.
      issuer: issuerConfig.issuer,
      // TODO: differentiate if DPoP should be true
      dpop: options.tokenType.toLowerCase() === "dpop",
      ...options,
      issuerConfiguration: issuerConfig,
      client: clientRegistration,
    };

    // Call proper OIDC Handler
    return this.oidcHandler.handle(OidcOptions);
  }
}
