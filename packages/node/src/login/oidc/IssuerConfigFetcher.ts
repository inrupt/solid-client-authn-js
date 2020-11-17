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
  ConfigurationError,
} from "@inrupt/solid-client-authn-core";
import { injectable, inject } from "tsyringe";
import { Issuer, IssuerMetadata } from "openid-client";

export const WELL_KNOWN_OPENID_CONFIG = ".well-known/openid-configuration";

function configFromIssuerMetadata(metadata: IssuerMetadata): IIssuerConfig {
  // If the fields required as per https://openid.net/specs/openid-connect-discovery-1_0.html are missing,
  // throw an error.
  if (metadata.authorization_endpoint === undefined) {
    throw new ConfigurationError(
      `Issuer metadata is missing an authorization endpoint: ${JSON.stringify(
        metadata
      )}`
    );
  }
  if (metadata.token_endpoint === undefined) {
    throw new ConfigurationError(
      `Issuer metadata is missing an token endpoint: ${JSON.stringify(
        metadata
      )}`
    );
  }
  if (metadata.jwks_uri === undefined) {
    throw new ConfigurationError(
      `Issuer metadata is missing a keyset URI: ${JSON.stringify(metadata)}`
    );
  }
  if (metadata.claims_supported === undefined) {
    throw new ConfigurationError(
      `Issuer metadata is missing supported claims: ${JSON.stringify(metadata)}`
    );
  }
  if (metadata.subject_types_supported === undefined) {
    throw new ConfigurationError(
      `Issuer metadata is missing supported subject types: ${JSON.stringify(
        metadata
      )}`
    );
  }
  return {
    issuer: metadata.issuer,
    authorizationEndpoint: metadata.authorization_endpoint,
    subjectTypesSupported: metadata.subject_types_supported as string[],
    claimsSupported: metadata.claims_supported as string[],
    tokenEndpoint: metadata.token_endpoint,
    jwksUri: metadata.jwks_uri,
    userinfoEndpoint: metadata.userinfo_endpoint,
    registrationEndpoint: metadata.registration_endpoint,
    tokenEndpointAuthMethodsSupported:
      metadata.token_endpoint_auth_methods_supported,
    tokenEndpointAuthSigningAlgValuesSupported:
      metadata.token_endpoint_auth_signing_alg_values_supported,
    requestObjectSigningAlgValuesSupported:
      metadata.request_object_signing_alg_values_supported,
    // TODO: add revocation_endpoint, end_session_endpoint, introspection_endpoint_auth_methods_supported, introspection_endpoint_auth_signing_alg_values_supported, revocation_endpoint_auth_methods_supported, revocation_endpoint_auth_signing_alg_values_supported, mtls_endpoint_aliases to IIssuerConfig

    // The following properties may be captured as "unkown" entries in the metadata object.
    grantTypesSupported: metadata.grant_types_supported as string[] | undefined,
    responseTypesSupported: metadata.response_types_supported as
      | string[]
      | undefined,
  };
}

/**
 * @hidden
 */
@injectable()
export default class IssuerConfigFetcher implements IIssuerConfigFetcher {
  constructor(
    @inject("storageUtility") private storageUtility: IStorageUtility
  ) {}

  // This method needs no state (so can be static), and can be exposed to allow
  // callers to know where this implementation puts state it needs.
  public static getLocalStorageKey(issuer: string): string {
    return `issuerConfig:${issuer}`;
  }

  async fetchConfig(issuer: string): Promise<IIssuerConfig> {
    // TODO: The issuer config discovery happens in multiple places in the current
    // codebase, because in openid-client the Client is built based on the Issuer.
    // The codebase could be refactored so that issuer discovery only happens once.
    const oidcIssuer = await Issuer.discover(issuer);
    const issuerConfig: IIssuerConfig = configFromIssuerMetadata(
      oidcIssuer.metadata
    );

    // Update store with fetched config
    await this.storageUtility.set(
      IssuerConfigFetcher.getLocalStorageKey(issuer),
      JSON.stringify(issuerConfig)
    );

    return issuerConfig;
  }
}
