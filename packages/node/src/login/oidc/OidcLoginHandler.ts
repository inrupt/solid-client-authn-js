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

import {
  IClientRegistrar,
  IIssuerConfigFetcher,
  ILoginOptions,
  ILoginHandler,
  IOidcHandler,
  IStorageUtility,
  ConfigurationError,
  IClient,
  IOidcOptions,
  LoginResult,
  handleRegistration,
} from "@inrupt/solid-client-authn-core";

function hasIssuer(
  options: ILoginOptions
): options is ILoginOptions & { oidcIssuer: string } {
  return typeof options.oidcIssuer === "string";
}

// TODO: the following code must be pushed to the handlers that actually need redirection
// function hasRedirectUrl(
//   options: ILoginOptions
// ): options is ILoginOptions & { redirectUrl: string } {
//   return typeof options.redirectUrl === "string";
// }

/**
 * @hidden
 */
export default class OidcLoginHandler implements ILoginHandler {
  constructor(
    private storageUtility: IStorageUtility,
    private oidcHandler: IOidcHandler,
    private issuerConfigFetcher: IIssuerConfigFetcher,
    private clientRegistrar: IClientRegistrar
  ) {}

  async canHandle(options: ILoginOptions): Promise<boolean> {
    return hasIssuer(options);
  }

  async handle(options: ILoginOptions): Promise<LoginResult> {
    if (!hasIssuer(options)) {
      throw new ConfigurationError(
        `OidcLoginHandler requires an OIDC issuer: missing property 'oidcIssuer' in ${JSON.stringify(
          options
        )}`
      );
    }
    // TODO: the following code must be pushed to the handlers that actually need redirection
    // if (!hasRedirectUrl(options)) {
    //   throw new ConfigurationError(
    //     `OidcLoginHandler requires a redirect URL: missing property 'redirectUrl' in ${JSON.stringify(
    //       options
    //     )}`
    //   );
    // }

    const issuerConfig = await this.issuerConfigFetcher.fetchConfig(
      options.oidcIssuer
    );

    const clientInfo: IClient = await handleRegistration(
      options,
      issuerConfig,
      this.storageUtility,
      this.clientRegistrar
    );

    // Construct OIDC Options
    const oidcOptions: IOidcOptions = {
      issuer: issuerConfig.issuer,
      // TODO: differentiate if DPoP should be true
      dpop: options.tokenType.toLowerCase() === "dpop",
      // TODO Cleanup to remove the type assertion
      redirectUrl: options.redirectUrl as string,
      issuerConfiguration: issuerConfig,
      client: clientInfo,
      sessionId: options.sessionId,
      // If the refresh token is available in storage, use it.
      refreshToken:
        options.refreshToken ??
        (await this.storageUtility.getForUser(
          options.sessionId,
          "refreshToken"
        )),
      handleRedirect: options.handleRedirect,
      onNewRefreshToken: options.onNewRefreshToken,
    };
    // Call proper OIDC Handler
    return this.oidcHandler.handle(oidcOptions);
  }
}
