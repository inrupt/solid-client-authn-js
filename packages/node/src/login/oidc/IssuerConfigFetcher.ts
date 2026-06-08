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

// ---------------------------------------------------------------------------
// MIGRATION: oauth4webapi + dpop — Phase 4 (proposal/migrate-to-oauth4webapi)
// ---------------------------------------------------------------------------
// Before: discovery went through `openid-client` `Issuer.discover(issuer)` and
// the resulting `IssuerMetadata` was mapped to `IIssuerConfig` via
// `configFromIssuerMetadata`. The reverse mapping (`configToIssuerMetadata`)
// was consumed across the package to re-instantiate an openid-client `Issuer`.
//
// After: discovery is `oauth.discoveryRequest` + `oauth.processDiscoveryResponse`
// (OIDC well-known algorithm — same default as `Issuer.discover`), producing an
// `oauth.AuthorizationServer`, mapped to `IIssuerConfig` by
// `configFromAuthorizationServer`. The `oauth.AuthorizationServer` shape is
// rebuilt directly from `IIssuerConfig` by `asAuthorizationServer` in
// `oauth/oauthAdapter.ts`, so `configToIssuerMetadata` (and the openid-client
// `IssuerMetadata` dependency) is gone.
// ---------------------------------------------------------------------------

/**
 * Responsible for fetching an IDP configuration
 */
import type {
  IIssuerConfig,
  IIssuerConfigFetcher,
  IStorageUtility,
} from "@inrupt/solid-client-authn-core";
import { ConfigurationError } from "@inrupt/solid-client-authn-core";
import * as oauth from "oauth4webapi";

// Camelcase identifiers are required in the OIDC specification.
/* eslint-disable camelcase*/

/**
 * Transforms an oauth4webapi {@link oauth.AuthorizationServer} object into an
 * [[IIssuerConfig]].
 * @param metadata the discovered Authorization Server metadata to transform.
 * @returns an [[IIssuerConfig]] initialized from the metadata.
 * @internal
 */
export function configFromAuthorizationServer(
  metadata: oauth.AuthorizationServer,
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
    // The following properties may be captured as "unknown" entries in the metadata object.
    grantTypesSupported: metadata.grant_types_supported as string[] | undefined,
    responseTypesSupported: metadata.response_types_supported as
      | string[]
      | undefined,
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
    // TODO: The issuer config discovery happens in multiple places in the current
    // codebase. The codebase could be refactored so that issuer discovery only
    // happens once and the AuthorizationServer is threaded through directly
    // (Phase 3 cross-cutting cleanup).
    const issuerUrl = new URL(issuer);
    // `algorithm: "oidc"` resolves the OpenID Connect Discovery 1.0 well-known
    // path, matching the legacy `openid-client` `Issuer.discover` default used by
    // Solid IdPs.
    const discoveryResponse = await oauth.discoveryRequest(issuerUrl, {
      algorithm: "oidc",
    });
    const authorizationServer = await oauth.processDiscoveryResponse(
      issuerUrl,
      discoveryResponse,
    );
    const issuerConfig: IIssuerConfig =
      configFromAuthorizationServer(authorizationServer);
    // Update store with fetched config
    await this.storageUtility.set(
      IssuerConfigFetcher.getLocalStorageKey(issuer),
      JSON.stringify(issuerConfig),
    );

    return issuerConfig;
  }
}
