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
} from "@inrupt/solid-client-authn-core";

import { IClient } from "@inrupt/oidc-client-ext";

function isValidUrl(url: string): boolean {
  try {
    // Here, the URL constructor is just called to parse the given string and
    // verify if it is a well-formed IRI.
    // eslint-disable-next-line no-new
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

async function handleRegistration(
  options: ILoginOptions,
  issuerConfig: IIssuerConfig,
  storageUtility: IStorageUtility,
  clientRegistrar: IClientRegistrar
): Promise<IClient> {
  if (
    options.clientId === undefined ||
    (issuerConfig.solidOidcSupported === false && isValidUrl(options.clientId))
  ) {
    // If no client_id is provided, the client must go through DCR. Whether the
    // Identity Provider supports Solid-OIDC or not will only change the value
    // of the provided client_id.
    // The tricky case is if a client WebID (here, a client_id looking like an IRI)
    // is provided, but the Identity Provider does not support Solid-OIDC. In this
    // case, we must discard the provided client_id, and still go through dynamic
    // client registration, because the Identity Provider will not recognize the
    // provided client_id.
    return clientRegistrar.getClient(
      {
        sessionId: options.sessionId,
        clientName: options.clientName,
        redirectUrl: options.redirectUrl,
      },
      issuerConfig
    );
  }
  // If the Identity Provider is Solid-OIDC compliant, or if the client_id isn't
  // an IRI and therefore has been previously registered to the IdP, the client
  // registration information just need to be stored to be retrieved after redirect.
  await storageUtility.setForUser(options.sessionId, {
    clientId: options.clientId,
  });
  if (options.clientSecret) {
    await storageUtility.setForUser(options.sessionId, {
      clientSecret: options.clientSecret,
    });
  }
  if (options.clientName) {
    await storageUtility.setForUser(options.sessionId, {
      clientName: options.clientName,
    });
  }
  return {
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    clientName: options.clientName,
  };
}

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

    // Fetch issuer config.
    const issuerConfig: IIssuerConfig = await this.issuerConfigFetcher.fetchConfig(
      options.oidcIssuer
    );

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
      redirectUrl: options.redirectUrl,
      issuerConfiguration: issuerConfig,
      client: clientRegistration,
      sessionId: options.sessionId,
      handleRedirect: options.handleRedirect,
      prompt: options.prompt,
    };

    // Call proper OIDC Handler
    return this.oidcHandler.handle(OidcOptions);
  }
}
