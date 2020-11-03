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
 * Responsible for fetching an IDP configuration
 */
import {
  IIssuerConfig,
  IIssuerConfigFetcher,
  IStorageUtility,
} from "@inrupt/solid-client-authn-core";
import { injectable, inject } from "tsyringe";
import { appendToUrlPathname, IFetcher } from "../../util/Fetcher";
import ConfigurationError from "../../errors/ConfigurationError";

export const WELL_KNOWN_OPENID_CONFIG = ".well-known/openid-configuration";

/* eslint-disable @typescript-eslint/camelcase */
const issuerConfigKeyMap: Record<
  string,
  { toKey: string; convertToUrl?: boolean }
> = {
  issuer: {
    toKey: "issuer",
    convertToUrl: true,
  },
  authorization_endpoint: {
    toKey: "authorizationEndpoint",
    convertToUrl: true,
  },
  token_endpoint: {
    toKey: "tokenEndpoint",
    convertToUrl: true,
  },
  userinfo_endpoint: {
    toKey: "userinfoEndpoint",
    convertToUrl: true,
  },
  jwks_uri: {
    toKey: "jwksUri",
    convertToUrl: true,
  },
  registration_endpoint: {
    toKey: "registrationEndpoint",
    convertToUrl: true,
  },
  scopes_supported: { toKey: "scopesSupported" },
  response_types_supported: { toKey: "responseTypesSupported" },
  response_modes_supported: { toKey: "responseModesSupported" },
  grant_types_supported: { toKey: "grantTypesSupported" },
  acr_values_supported: { toKey: "acrValuesSupported" },
  subject_types_supported: { toKey: "subjectTypesSupported" },
  id_token_signing_alg_values_supported: {
    toKey: "idTokenSigningAlgValuesSupported",
  },
  id_token_encryption_alg_values_supported: {
    toKey: "idTokenEncryptionAlgValuesSupported",
  },
  id_token_encryption_enc_values_supported: {
    toKey: "idTokenEncryptionEncValuesSupported",
  },
  userinfo_signing_alg_values_supported: {
    toKey: "userinfoSigningAlgValuesSupported",
  },
  userinfo_encryption_alg_values_supported: {
    toKey: "userinfoEncryptionAlgValuesSupported",
  },
  userinfo_encryption_enc_values_supported: {
    toKey: "userinfoEncryptionEncValuesSupported",
  },
  request_object_signing_alg_values_supported: {
    toKey: "requestObjectSigningAlgValuesSupported",
  },
  request_object_encryption_alg_values_supported: {
    toKey: "requestObjectEncryptionAlgValuesSupported",
  },
  request_object_encryption_enc_values_supported: {
    toKey: "requestObjectEncryptionEncValuesSupported",
  },
  token_endpoint_auth_methods_supported: {
    toKey: "tokenEndpointAuthMethodsSupported",
  },
  token_endpoint_auth_signing_alg_values_supported: {
    toKey: "tokenEndpointAuthSigningAlgValuesSupported",
  },
  display_values_supported: { toKey: "displayValuesSupported" },
  claim_types_supported: { toKey: "claimTypesSupported" },
  claims_supported: { toKey: "claimsSupported" },
  service_documentation: { toKey: "serviceDocumentation" },
  claims_locales_supported: { toKey: "claimsLocalesSupported" },
  ui_locales_supported: { toKey: "uiLocalesSupported" },
  claims_parameter_supported: { toKey: "claimsParameterSupported" },
  request_parameter_supported: { toKey: "requestParameterSupported" },
  request_uri_parameter_supported: { toKey: "requestUriParameterSupported" },
  require_request_uri_registration: { toKey: "requireRequestUriRegistration" },
  op_policy_uri: {
    toKey: "opPolicyUri",
    convertToUrl: true,
  },
  op_tos_uri: {
    toKey: "opTosUri",
    convertToUrl: true,
  },
};
/* eslint-enable @typescript-eslint/camelcase */

/**
 * @hidden
 */
@injectable()
export default class IssuerConfigFetcher implements IIssuerConfigFetcher {
  constructor(
    @inject("fetcher") private fetcher: IFetcher,
    @inject("storageUtility") private storageUtility: IStorageUtility
  ) {}

  // This method needs no state (so can be static), and can be exposed to allow
  // callers to know where this implementation puts state it needs.
  public static getLocalStorageKey(issuer: string): string {
    return `issuerConfig:${issuer}`;
  }

  private processConfig(
    config: Record<string, string | string[]>
  ): IIssuerConfig {
    const parsedConfig: Record<string, string | string[]> = {};
    Object.keys(config).forEach((key) => {
      if (issuerConfigKeyMap[key]) {
        // TODO: PMcB55: Validate URL if "issuerConfigKeyMap[key].convertToUrl"
        //  if (issuerConfigKeyMap[key].convertToUrl) {
        //   validateUrl(config[key]);
        //  }
        parsedConfig[issuerConfigKeyMap[key].toKey] = config[key];
      }
    });

    return (parsedConfig as unknown) as IIssuerConfig;
  }

  async fetchConfig(issuer: string): Promise<IIssuerConfig> {
    let issuerConfig: IIssuerConfig;

    const openIdConfigUrl = appendToUrlPathname(
      issuer,
      WELL_KNOWN_OPENID_CONFIG
    );

    const issuerConfigRequestBody = await this.fetcher.fetch(openIdConfigUrl);
    // Check the validity of the fetched config
    try {
      issuerConfig = this.processConfig(await issuerConfigRequestBody.json());
    } catch (err) {
      throw new ConfigurationError(
        `[${issuer.toString()}] has an invalid configuration: ${err.message}`
      );
    }

    // Update store with fetched config
    await this.storageUtility.set(
      IssuerConfigFetcher.getLocalStorageKey(issuer),
      JSON.stringify(issuerConfig)
    );

    return issuerConfig;
  }
}
