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
  IIssuerConfig,
  IIssuerConfigFetcher,
  ILoginOptions,
  ILoginHandler,
  IOidcHandler,
  IOidcOptions,
  IStorageUtility,
  ConfigurationError,
  LoginResult,
} from "@inrupt/solid-client-authn-core";

import { IClient } from "@inrupt/oidc-client-ext";

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
    @inject("storageUtility") private storageUtility: IStorageUtility,
    @inject("oidcHandler") private oidcHandler: IOidcHandler,
    @inject("issuerConfigFetcher")
    private issuerConfigFetcher: IIssuerConfigFetcher,
    @inject("clientRegistrar") private clientRegistrar: IClientRegistrar
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

    // Fetch OpenId Config
    const issuerConfig: IIssuerConfig = await this.issuerConfigFetcher.fetchConfig(
      options.oidcIssuer
    );

    let dynamicClientRegistration: IClient;
    if (options.clientId) {
      dynamicClientRegistration = {
        clientId: options.clientId,
        clientSecret: options.clientSecret,
        clientName: options.clientName,
      };
    } else {
      const clientId = await this.storageUtility.getForUser(
        "clientApplicationRegistrationInfo",
        "clientId"
      );

      if (clientId) {
        dynamicClientRegistration = {
          clientId,
          clientSecret: await this.storageUtility.getForUser(
            "clientApplicationRegistrationInfo",
            "clientSecret"
          ),
          clientName: options.clientName,
        };
      } else {
        dynamicClientRegistration = await this.clientRegistrar.getClient(
          {
            sessionId: options.sessionId,
            clientName: options.clientName,
            redirectUrl: options.redirectUrl,
          },
          issuerConfig
        );

        await this.storageUtility.setForUser(
          "clientApplicationRegistrationInfo",
          {
            clientId: dynamicClientRegistration.clientId,
            clientSecret: dynamicClientRegistration.clientSecret as string,
          }
        );
      }
    }

    // Construct OIDC Options
    const OidcOptions: IOidcOptions = {
      issuer: options.oidcIssuer,
      // TODO: differentiate if DPoP should be true
      dpop: options.tokenType.toLowerCase() === "dpop",
      redirectUrl: options.redirectUrl,
      issuerConfiguration: issuerConfig,
      client: dynamicClientRegistration,
      sessionId: options.sessionId,
      handleRedirect: options.handleRedirect,
    };

    // Call proper OIDC Handler
    return await this.oidcHandler.handle(OidcOptions);
  }
}
