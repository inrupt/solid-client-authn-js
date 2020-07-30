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
 * Responsible for fetching an IDP configuration
 */
import IIssuerConfig from "./IIssuerConfig";
import URL from "url-parse";
import { injectable, inject } from "tsyringe";
import { IFetcher } from "../../util/Fetcher";
import issuerConfigSchema from "./issuerConfigSchema";
import ConfigurationError from "../../errors/ConfigurationError";
import { IStorageUtility } from "../../storage/StorageUtility";

export interface IIssuerConfigFetcher {
  /**
   * Fetches the configuration
   * @param issuer URL of the IDP
   */
  fetchConfig(issuer: URL): Promise<IIssuerConfig>;
}

/* eslint-disable @typescript-eslint/camelcase */
const issuerConfigKeyMap: Record<
  string,
  { toKey: string; convertToUrl?: boolean }
> = {
  issuer: {
    toKey: "issuer",
    convertToUrl: true
  },
  authorization_endpoint: {
    toKey: "authorizationEndpoint",
    convertToUrl: true
  },
  token_endpoint: {
    toKey: "tokenEndpoint",
    convertToUrl: true
  },
  userinfo_endpoint: {
    toKey: "userinfoEndpoint",
    convertToUrl: true
  },
  jwks_uri: {
    toKey: "jwksUri",
    convertToUrl: true
  },
  registration_endpoint: {
    toKey: "registrationEndpoint",
    convertToUrl: true
  },
  scopes_supported: { toKey: "scopesSupported" },
  response_types_supported: { toKey: "responseTypesSupported" },
  response_modes_supported: { toKey: "responseModesSupported" },
  grant_types_supported: { toKey: "grantTypesSupported" },
  acr_values_supported: { toKey: "acrValuesSupported" },
  subject_types_supported: { toKey: "subjectTypesSupported" },
  id_token_signing_alg_values_supported: {
    toKey: "idTokenSigningAlgValuesSupported"
  },
  id_token_encryption_alg_values_supported: {
    toKey: "idTokenEncryptionAlgValuesSupported"
  },
  id_token_encryption_enc_values_supported: {
    toKey: "idTokenEncryptionEncValuesSupported"
  },
  userinfo_signing_alg_values_supported: {
    toKey: "userinfoSigningAlgValuesSupported"
  },
  userinfo_encryption_alg_values_supported: {
    toKey: "userinfoEncryptionAlgValuesSupported"
  },
  userinfo_encryption_enc_values_supported: {
    toKey: "userinfoEncryptionEncValuesSupported"
  },
  request_object_signing_alg_values_supported: {
    toKey: "requestObjectSigningAlgValuesSupported"
  },
  request_object_encryption_alg_values_supported: {
    toKey: "requestObjectEncryptionAlgValuesSupported"
  },
  request_object_encryption_enc_values_supported: {
    toKey: "requestObjectEncryptionEncValuesSupported"
  },
  token_endpoint_auth_methods_supported: {
    toKey: "tokenEndpointAuthMethodsSupported"
  },
  token_endpoint_auth_signing_alg_values_supported: {
    toKey: "tokenEndpointAuthSigningAlgValuesSupported"
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
    convertToUrl: true
  },
  op_tos_uri: {
    toKey: "opTosUri",
    convertToUrl: true
  }
};
/* eslint-enable @typescript-eslint/camelcase */

@injectable()
export default class IssuerConfigFetcher implements IIssuerConfigFetcher {
  constructor(
    @inject("fetcher") private fetcher: IFetcher,
    @inject("storageUtility") private storageUtility: IStorageUtility
  ) {}

  private getLocalStorageKey(issuer: URL): string {
    return `issuerConfig:${issuer.toString()}`;
  }

  private processConfig(
    config: Record<string, string | string[]>
  ): IIssuerConfig {
    const parsedConfig: Record<string, string | string[] | URL> = {};
    Object.keys(config).forEach(key => {
      if (issuerConfigKeyMap[key]) {
        parsedConfig[issuerConfigKeyMap[key].toKey] = issuerConfigKeyMap[key]
          .convertToUrl
          ? new URL(config[key] as string)
          : config[key];
      }
    });
    return (parsedConfig as unknown) as IIssuerConfig;
  }

  async fetchConfig(issuer: URL): Promise<IIssuerConfig> {
    let issuerConfig: IIssuerConfig;

    // Try to look up the config in the cache
    issuerConfig = (await this.storageUtility.safeGet(
      this.getLocalStorageKey(issuer),
      {
        schema: issuerConfigSchema
      }
    )) as IIssuerConfig;

    // If a local copy of the config is available, don't fetch it
    if (issuerConfig !== undefined) {
      return issuerConfig;
    }

    const wellKnownUrl = new URL(issuer.toString());
    wellKnownUrl.set("pathname", "/.well-known/openid-configuration");
    const issuerConfigRequestBody = await this.fetcher.fetch(wellKnownUrl);
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
      this.getLocalStorageKey(issuer),
      JSON.stringify(issuerConfig)
    );

    return issuerConfig;
  }
}
