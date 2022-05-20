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
 * Handles Common Oidc login functions (Like fetching the configuration)
 */

import {
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
  ClientManager,
  IClient,
  StaticClient,
} from "@inrupt/solid-client-authn-core";

// FIXME: Remove extends from ILoginOptions:
export interface OidcLoginHandlerOptions extends ILoginOptions {
  redirectUrl: string;
  oidcIssuer: string;

  // This is always set by ClientAuthentication
  clientId: string;
}

function hasIssuer(
  options: OidcLoginHandlerOptions
): options is OidcLoginHandlerOptions & { oidcIssuer: string } {
  return typeof options.oidcIssuer === "string";
}

function hasRedirectUrl(
  options: OidcLoginHandlerOptions
): options is OidcLoginHandlerOptions & { redirectUrl: string } {
  return typeof options.redirectUrl === "string";
}

/**
 * @hidden
 */
export default class OidcLoginHandler implements ILoginHandler {
  constructor(
    private storageUtility: IStorageUtility,
    private oidcHandler: IOidcHandler,
    private issuerConfigFetcher: IIssuerConfigFetcher,
    private clientManager: ClientManager
  ) {}

  async canHandle(options: OidcLoginHandlerOptions): Promise<boolean> {
    return hasIssuer(options) && hasRedirectUrl(options);
  }

  async handle(options: OidcLoginHandlerOptions): Promise<LoginResult> {
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

    // FIXME: I don't think the following code is correct / necessary:
    // FIXME: We want to only register the client if we're doing an active login, for silent login, we want this to happen in the background

    // Fetch issuer config.
    const issuerConfig: IIssuerConfig =
      await this.issuerConfigFetcher.fetchConfig(options.oidcIssuer);

    // const clientInfo = await handleRegistration(
    //   options,
    //   issuerConfig,
    //   this.storageUtility,
    //   this.clientManager
    // );

    const clientDetails: Omit<IClient, "clientType"> = {
      clientId: options.clientId,
      clientName: options.clientName,
    };

    if (options.clientSecret) {
      (clientDetails as StaticClient).clientSecret = options.clientSecret;
    }

    const clientInfo = await this.clientManager.register(
      options.oidcIssuer,
      clientDetails
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
      client: clientInfo,
    };

    // Call proper OIDC Handler
    return this.oidcHandler.handle(OidcOptions);
  }
}
