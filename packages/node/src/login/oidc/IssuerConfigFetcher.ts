// Copyright Inrupt Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
// Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

/**
 * @hidden
 * @packageDocumentation
 */

/**
 * Responsible for fetching an IDP configuration
 */
import type {
  IIssuerConfig,
  IIssuerConfigFetcher,
  IStorageUtility,
} from "@inrupt/solid-client-authn-core";
import { ConfigurationError } from "@inrupt/solid-client-authn-core";
import type { ServerMetadata } from "openid-client";
import { allowInsecureRequests, discovery } from "openid-client";
import { isLoopbackHttpUrl } from "../../util/isLoopbackHttpUrl";

const WELL_KNOWN_OPENID_CONFIG = ".well-known/openid-configuration";
// openid-client requires a client ID for discovery, but it is not used.
const DISCOVERY_CLIENT_ID = "solid-client-authn-node-discovery";
// The OpenID Connect Discovery default value of grant_types_supported.
const DEFAULT_GRANT_TYPES_SUPPORTED = ["authorization_code", "implicit"];

// Bounds the cause chain walk, in case of cyclic causes.
const MAX_ERROR_CAUSE_DEPTH = 5;

/**
 * Describes an error and its causes (e.g. the network or TLS error behind a
 * generic "fetch failed"), including their error codes if any. JSON parsing
 * errors are not described, as their message includes parts of the response
 * body.
 *
 * @param error the error to describe.
 * @returns a description of the error and its causes.
 * @hidden
 */
export function describeErrorCauses(error: unknown): string {
  const descriptions: string[] = [];
  let current: unknown = error;
  while (
    current instanceof Error &&
    !(current instanceof SyntaxError) &&
    descriptions.length < MAX_ERROR_CAUSE_DEPTH
  ) {
    const { code } = current as Error & { code?: unknown };
    descriptions.push(
      typeof code === "string"
        ? `${code}: ${current.message}`
        : current.message,
    );
    current = current.cause;
  }
  return descriptions.join(" <- ");
}

// Camelcase identifiers are required in the OIDC specification.
/* eslint-disable camelcase*/

/**
 * Transforms an openid-client ServerMetadata object into an [[IIssuerConfig]]
 * @param metadata the object to transform.
 * @returns an [[IIssuerConfig]] initialized from the metadata.
 * @internal
 */
export function configFromIssuerMetadata(
  metadata: ServerMetadata,
): IIssuerConfig {
  // If the fields required as per https://openid.net/specs/openid-connect-discovery-1_0.html are missing,
  // throw an error.
  if (metadata.authorization_endpoint === undefined) {
    throw new ConfigurationError(
      `Issuer metadata is missing an authorization endpoint: ${JSON.stringify(
        metadata,
      )}`,
    );
  }
  if (metadata.token_endpoint === undefined) {
    throw new ConfigurationError(
      `Issuer metadata is missing an token endpoint: ${JSON.stringify(
        metadata,
      )}`,
    );
  }
  if (metadata.jwks_uri === undefined) {
    throw new ConfigurationError(
      `Issuer metadata is missing a keyset URI: ${JSON.stringify(metadata)}`,
    );
  }
  if (metadata.claims_supported === undefined) {
    throw new ConfigurationError(
      `Issuer metadata is missing supported claims: ${JSON.stringify(
        metadata,
      )}`,
    );
  }
  if (metadata.subject_types_supported === undefined) {
    throw new ConfigurationError(
      `Issuer metadata is missing supported subject types: ${JSON.stringify(
        metadata,
      )}`,
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
    // grant_types_supported is optional, and defaults to ["authorization_code", "implicit"]
    // (see https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata).
    grantTypesSupported:
      metadata.grant_types_supported === undefined
        ? [...DEFAULT_GRANT_TYPES_SUPPORTED]
        : (metadata.grant_types_supported as string[]),
    responseTypesSupported: metadata.response_types_supported as
      string[] | undefined,
    idTokenSigningAlgValuesSupported:
      metadata.id_token_signing_alg_values_supported as string[] | undefined,
    scopesSupported:
      metadata.scopes_supported === undefined
        ? ["openid"]
        : (metadata.scopes_supported as string[]),
    endSessionEndpoint: metadata.end_session_endpoint,
  };
}

/**
 * Transforms an [[IIssuerConfig]] into an openid-client ServerMetadata
 * @param config the IIssuerConfig to convert.
 * @returns a ServerMetadata object initialized from the [[IIssuerConfig]].
 */
export function configToIssuerMetadata(config: IIssuerConfig): ServerMetadata {
  return {
    issuer: config.issuer,
    authorization_endpoint: config.authorizationEndpoint,
    jwks_uri: config.jwksUri,
    token_endpoint: config.tokenEndpoint,
    registration_endpoint: config.registrationEndpoint,
    subject_types_supported: config.subjectTypesSupported,
    claims_supported: config.claimsSupported,
    token_endpoint_auth_signing_alg_values_supported:
      config.tokenEndpointAuthSigningAlgValuesSupported,
    userinfo_endpoint: config.userinfoEndpoint,
    token_endpoint_auth_methods_supported:
      config.tokenEndpointAuthMethodsSupported,
    request_object_signing_alg_values_supported:
      config.requestObjectSigningAlgValuesSupported,
    grant_types_supported: config.grantTypesSupported,
    response_types_supported: config.responseTypesSupported,
    id_token_signing_alg_values_supported:
      config.idTokenSigningAlgValuesSupported,
    scopes_supported: config.scopesSupported,
    end_session_endpoint: config.endSessionEndpoint,
  };
}

/**
 * @hidden
 */
export default class IssuerConfigFetcher implements IIssuerConfigFetcher {
  constructor(private storageUtility: IStorageUtility) {
    this.storageUtility = storageUtility;
  }

  // This method needs no state (so can be static), and can be exposed to allow
  // callers to know where this implementation puts state it needs.
  public static getLocalStorageKey(issuer: string): string {
    return `issuerConfig:${issuer}`;
  }

  async fetchConfig(issuer: string): Promise<IIssuerConfig> {
    const issuerUrl = new URL(issuer);
    if (issuerUrl.protocol !== "https:" && !isLoopbackHttpUrl(issuerUrl)) {
      throw new ConfigurationError(
        `The issuer [${issuer}] must use HTTPS. Plain HTTP is only supported for loopback hosts.`,
      );
    }
    const discoveryUrl = new URL(
      WELL_KNOWN_OPENID_CONFIG,
      issuer.endsWith("/") ? issuer : `${issuer}/`,
    );
    let metadata: ServerMetadata;
    try {
      // openid-client applies its HTTPS, redirects, timeout and response
      // validation policies to the discovery request. The client ID is
      // irrelevant, as only the issuer metadata is used. The discovery
      // document URL is provided directly, so that openid-client doesn't
      // apply its strict issuer validation, which is done below instead.
      const config = await discovery(
        discoveryUrl,
        DISCOVERY_CLIENT_ID,
        undefined,
        undefined,
        {
          execute: isLoopbackHttpUrl(issuerUrl)
            ? [allowInsecureRequests]
            : undefined,
        },
      );
      metadata = config.serverMetadata();
    } catch (e) {
      throw new ConfigurationError(
        `Fetching the configuration of issuer [${issuer}] at [${discoveryUrl.href}] failed: ${describeErrorCauses(e)}`,
      );
    }
    // See https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderConfigurationValidation
    // Trailing slash differences are tolerated, as they are common in the wild.
    if (metadata.issuer.replace(/\/$/, "") !== issuer.replace(/\/$/, "")) {
      throw new ConfigurationError(
        `The issuer identifier [${metadata.issuer}] in the configuration fetched from [${discoveryUrl.href}] does not match the expected issuer [${issuer}].`,
      );
    }
    const issuerConfig: IIssuerConfig = configFromIssuerMetadata(metadata);
    // Update store with fetched config
    await this.storageUtility.set(
      IssuerConfigFetcher.getLocalStorageKey(issuer),
      JSON.stringify(issuerConfig),
    );

    return issuerConfig;
  }
}
