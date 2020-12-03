/*
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
 * @hidden
 * @packageDocumentation
 */

/**
 * Handles Common Oidc login functions (Like fetching the configuration)
 */

import { injectable, inject } from "tsyringe";
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
  ISessionInfo,
  LoginResult,
} from "@inrupt/solid-client-authn-core";
import { fetch } from "cross-fetch";

function hasIssuer(
  options: ILoginOptions
): options is ILoginOptions & { oidcIssuer: string } {
  return typeof options.oidcIssuer === "string";
}

// function hasRedirectUrl(
//   options: ILoginOptions
// ): options is ILoginOptions & { redirectUrl: string } {
//   return typeof options.redirectUrl === "string";
// }

/**
 * @hidden
 */
@injectable()
export default class OidcLoginHandler implements ILoginHandler {
  constructor(
    @inject("storageUtility") private _storageUtility: IStorageUtility,
    @inject("oidcHandler") private oidcHandler: IOidcHandler,
    @inject("issuerConfigFetcher")
    private issuerConfigFetcher: IIssuerConfigFetcher,
    @inject("clientRegistrar") private clientRegistrar: IClientRegistrar
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
    let clientInfo: IClient;
    if (options.clientId !== undefined) {
      clientInfo = {
        clientId: options.clientId,
        clientSecret: options.clientSecret,
      };
    } else {
      // If 'client_id' and 'client_secret' aren't specified in the options,
      // perform dynamic client registration.
      clientInfo = await this.clientRegistrar.getClient(options, issuerConfig);
    }

    // Construct OIDC Options
    const oidcOptions: IOidcOptions = {
      issuer: options.oidcIssuer,
      // TODO: differentiate if DPoP should be true
      dpop: options.tokenType.toLowerCase() === "dpop",
      // TODO Cleanup to remove the type assertion
      redirectUrl: options.redirectUrl as string,
      issuerConfiguration: issuerConfig,
      client: clientInfo,
      sessionId: options.sessionId,
      refreshToken: options.refreshToken,
      handleRedirect: options.handleRedirect,
    };
    // Call proper OIDC Handler
    return this.oidcHandler.handle(oidcOptions);
  }
}
