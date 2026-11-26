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

// Camelcase identifiers are aligned with the OAuth specification.
/* eslint-disable camelcase*/

import { LRUCache } from "lru-cache";
import type { KeyPair } from "./dpopUtils";
import { createDpopHeader } from "./dpopUtils";

export const SUPPORTED_AUTHN_SCHEMES = ["Bearer", "DPoP", "UMA"] as const;

export type AuthnChallenge = Partial<
  Record<(typeof SUPPORTED_AUTHN_SCHEMES)[number], Record<string, string>>
>;

/**
 * See {@link https://datatracker.ietf.org/doc/html/rfc9728}
 */
export type ProtectedResourceMetadata = {
  resource: string;
  authorization_servers?: string[];
  bearer_methods_supported?: string[];
  scopes_supported?: string[];
};

/**
 * See {@link https://datatracker.ietf.org/doc/html/rfc8414}
 */
export type AuthorizationServerMetadata = {
  issuer: string;
  authorization_endpoint?: string;
  // Implicit grant is not in scope for this library, so the token endpoint is mandatory.
  token_endpoint: string;
  jwks_uri?: string;
  response_types_supported: string[];
  // Defaults to ["authorization_code", "implicit"] as per RFC
  grant_types_supported: string[];
  // Defaults to client_secret_basic as per RFC
  token_endpoint_auth_methods_supported: string[];
  token_endpoint_auth_signing_alg_values_supported?: string[];
  dpop_signing_alg_values_supported?: string[];
  // Recommended, but optional as per RFC 8414
  scopes_supported?: string[];
  client_id_metadata_document_supported: boolean;
};

export function isResourceMetadata(x: unknown): x is ProtectedResourceMetadata {
  return x !== null && typeof x === "object" && Object.hasOwn(x, "resource");
}

function hasStringArray(x: Record<string, unknown>, field: string): boolean {
  return (
    Object.hasOwn(x, field) &&
    x[field] !== undefined &&
    Array.isArray(x[field]) &&
    x[field].every((val) => typeof val === "string")
  );
}

export function hasAuthServer(
  rm: ProtectedResourceMetadata,
): rm is ProtectedResourceMetadata & { authorization_servers: string[] } {
  return hasStringArray(rm, "authorization_servers");
}

function hasString(x: Record<string, unknown>, field: string): boolean {
  return Object.hasOwn(x, field) && typeof x[field] === "string";
}

// Default values for omitted fields, as per https://www.rfc-editor.org/rfc/rfc8414#section-2
// and https://datatracker.ietf.org/doc/draft-ietf-oauth-client-id-metadata-document/
const AS_METADATA_DEFAULTS: Partial<AuthorizationServerMetadata> = {
  grant_types_supported: ["authorization_code", "implicit"],
  token_endpoint_auth_methods_supported: ["client_secret_basic"],
  client_id_metadata_document_supported: false,
};

// Fills in the default values for fields omitted from the AS metadata.
// Values explicitly provided are kept as-is, so that invalid values
// are still rejected by isASMetadata.
export function setAsMetaDefaults(
  r: Record<string, unknown>,
): Record<string, unknown> {
  return { ...AS_METADATA_DEFAULTS, ...r };
}

export function isASMetadata(x: unknown): x is AuthorizationServerMetadata {
  if (x === null || typeof x !== "object") {
    return false;
  }
  const md = x as Record<string, unknown>;
  return (
    hasString(md, "issuer") &&
    hasString(md, "token_endpoint") &&
    hasStringArray(md, "response_types_supported") &&
    hasStringArray(md, "grant_types_supported") &&
    hasStringArray(md, "token_endpoint_auth_methods_supported") &&
    (md["scopes_supported"] === undefined ||
      hasStringArray(md, "scopes_supported")) &&
    typeof md["client_id_metadata_document_supported"] === "boolean"
  );
}

/**
 * Build the URL of the authorization server metadata, as per RFC 8414 section 3.1:
 * the well-known path is inserted between the host and the path of the issuer.
 *
 * @param issuer The authorization server issuer identifier.
 * @returns The authorization server metadata URL.
 */
export function asMetadataUrl(issuer: string): string {
  const issuerUrl = new URL(issuer);
  const path = issuerUrl.pathname === "/" ? "" : issuerUrl.pathname;
  return new URL(
    `/.well-known/oauth-authorization-server${path}`,
    issuerUrl.origin,
  ).href;
}

// RFC 9110, section 5.6.2
const TOKEN = /[!#$%&'*+\-.^_`|~0-9A-Za-z]+/y;

/**
 * Parse a WWW-Authenticate header value (RFC 9110, section 11.6.1) into the parameters
 * of each supported challenge. Unsupported challenges and their parameters are ignored.
 * Malformed input is skipped rather than rejected.
 *
 * @param header The WWW-Authenticate header value.
 * @returns The parameters of each supported challenge, keyed by canonical scheme name.
 */
export function parseAuthnChallenge(header: string): AuthnChallenge {
  const challenges: AuthnChallenge = {};
  // The parameters of the challenge being parsed, undefined if its scheme is unsupported.
  let current: Record<string, string> | undefined;
  let i = 0;
  const skipWhitespace = () => {
    while (header[i] === " " || header[i] === "\t") {
      i += 1;
    }
  };
  const readToken = (): string | undefined => {
    TOKEN.lastIndex = i;
    const match = TOKEN.exec(header);
    if (match === null) {
      return undefined;
    }
    i += match[0].length;
    return match[0];
  };
  const readQuotedString = (): string => {
    // Skip the opening quote.
    i += 1;
    let value = "";
    while (i < header.length && header[i] !== '"') {
      if (header[i] === "\\" && i + 1 < header.length) {
        // quoted-pair
        i += 1;
      }
      value += header[i];
      i += 1;
    }
    // Skip the closing quote.
    i += 1;
    return value;
  };
  while (i < header.length) {
    skipWhitespace();
    if (header[i] === ",") {
      i += 1;
      continue;
    }
    const token = readToken();
    if (token === undefined) {
      // Skip unexpected characters.
      i += 1;
      continue;
    }
    skipWhitespace();
    if (header[i] === "=") {
      // auth-param = token BWS "=" BWS ( token / quoted-string )
      i += 1;
      skipWhitespace();
      const value =
        header[i] === '"' ? readQuotedString() : (readToken() ?? "");
      if (current !== undefined) {
        current[token.toLowerCase()] = value;
      }
    } else {
      // A token not followed by "=" starts a new challenge.
      const scheme = SUPPORTED_AUTHN_SCHEMES.find(
        (supported) => supported.toLowerCase() === token.toLowerCase(),
      );
      current = scheme === undefined ? undefined : {};
      if (scheme !== undefined) {
        challenges[scheme] = current;
      }
    }
  }
  return challenges;
}

const SUPPORTED_TOKEN_TYPES = ["Bearer", "DPoP"] as const;
const SUPPORTED_ISSUED_TOKEN_TYPES = [
  "urn:ietf:params:oauth:token-type:access_token",
] as const;

export type TokenResponse = {
  access_token: string;
  token_type: (typeof SUPPORTED_TOKEN_TYPES)[number];
  issued_token_type: (typeof SUPPORTED_ISSUED_TOKEN_TYPES)[number];
  expires_in?: number;
};

// The token type is case-insensitive, as per RFC 6749 section 7.1.
function canonicalTokenType(
  tokenType: string,
): (typeof SUPPORTED_TOKEN_TYPES)[number] | undefined {
  return SUPPORTED_TOKEN_TYPES.find(
    (supported) => supported.toLowerCase() === tokenType.toLowerCase(),
  );
}

function isTokenResponse(x: unknown): x is TokenResponse {
  if (typeof x !== "object" || x === null) {
    return false;
  }
  const o = x as Record<string, unknown>;
  return (
    Object.hasOwn(o, "access_token") &&
    typeof o.access_token === "string" &&
    Object.hasOwn(o, "token_type") &&
    typeof o.token_type === "string" &&
    canonicalTokenType(o.token_type) !== undefined &&
    Object.hasOwn(o, "issued_token_type") &&
    typeof o.issued_token_type === "string" &&
    (SUPPORTED_ISSUED_TOKEN_TYPES as unknown as string[]).includes(
      o.issued_token_type,
    )
  );
}

/**
 * Perform an OAuth Token Exchange Grant compliant with {@link https://datatracker.ietf.org/doc/html/rfc8693}.
 *
 * @param token     The subject token
 * @param endpoint  The token endpoint
 * @param audience  The requested audience
 * @param resource  The requested resource
 * @param dpopKey   The DPoP key the subject token is bound to
 * @returns         The exchanged token
 * @throws          if the token exchange fails
 */
export async function exchange(
  token: string,
  endpoint: string,
  audience: string,
  resource: string,
  dpopKey?: KeyPair,
  options?: Partial<{
    customFetch: typeof fetch
  }>
): Promise<TokenResponse> {
  const exchangeFetch = options?.customFetch !== undefined
    ? options?.customFetch
    : fetch;
  const xchangeHeaders = new Headers({
    "Content-type": "application/x-www-form-urlencoded",
  });
  if (dpopKey !== undefined) {
    xchangeHeaders.set(
      "DPoP",
      await createDpopHeader(endpoint, "POST", dpopKey, token),
    );
  }
  return exchangeFetch(endpoint, {
    method: "POST",
    headers: xchangeHeaders,
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      subject_token: token,
      subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
      audience,
      resource,
    }),
  })
    .then((r) => {
      if (!r.ok) {
        throw new Error(
          "Token endoint returned an error during exchange: " + r.status,
        );
      }
      return r.json();
    })
    .then((data) => {
      if (!isTokenResponse(data)) {
        throw new Error("Unexpected token endoint response during exchange");
      }
      // Normalize the token type, so that it can be compared as-is.
      return {
        ...data,
        token_type: canonicalTokenType(
          data.token_type,
        ) as TokenResponse["token_type"],
      };
    })
    .catch((cause) => {
      throw new Error("Unexpected token endoint response during exchange", {
        cause,
      });
    });
}

export const DEFAULT_REACTIVE_AUTH_CACHE_SIZE = 100;
export const DEFAULT_METADATA_TTL_MS = 60 * 60 * 1000;

/**
 * The cache key for a URL. Caches compare keys by identity, so URLs are keyed by their
 * normalized serialization, which makes equivalent URLs share an entry.
 *
 * @param url The URL to key.
 * @returns The normalized URL, or undefined if it isn't a valid URL.
 */
export function cacheKey(url: string): string | undefined {
  try {
    return new URL(url).href;
  } catch {
    return undefined;
  }
}

// Metadata documents are public, and are validated before being cached (RFC 8414 issuer) or
// before each use (RFC 9728 resource), so they are shared across sessions.
const resourceMetadataCache = new LRUCache<string, ProtectedResourceMetadata>({
  max: DEFAULT_REACTIVE_AUTH_CACHE_SIZE,
  ttl: DEFAULT_METADATA_TTL_MS,
});
const asMetadataCache = new LRUCache<string, AuthorizationServerMetadata>({
  max: DEFAULT_REACTIVE_AUTH_CACHE_SIZE,
  ttl: DEFAULT_METADATA_TTL_MS,
});

/**
 * The protected resource metadata cache, keyed by the metadata URL advertised in the
 * resource_metadata challenge parameter.
 */
export const getResourceMetadataCache = () => resourceMetadataCache;

/**
 * The authorization server metadata cache, keyed by the authorization server identifier.
 */
export const getAsMetadataCache = () => asMetadataCache;

/**
 * Empty the metadata caches.
 */
export function clearMetadataCaches(): void {
  resourceMetadataCache.clear();
  asMetadataCache.clear();
}

/**
 * Exchanged tokens, keyed by the protected resource identifier they were issued for.
 * Tokens are specific to a session, so a token cache must not be shared across sessions.
 */
export type TokenCache = LRUCache<string, TokenResponse>;

/**
 * Create a token cache. Each entry is cached for its own TTL, set when it is added.
 */
export function createTokenCache(): TokenCache {
  return new LRUCache<string, TokenResponse>({
    max: DEFAULT_REACTIVE_AUTH_CACHE_SIZE,
  });
}

/**
 * Check whether a URL is within a protected resource, identified as per RFC 9728:
 * same origin, and a path under the resource path.
 */
export function isWithinResource(url: string, resource: string): boolean {
  let target: URL;
  let protectedResource: URL;
  try {
    target = new URL(url);
    protectedResource = new URL(resource);
  } catch {
    return false;
  }
  if (target.origin !== protectedResource.origin) {
    return false;
  }
  const resourcePath = protectedResource.pathname;
  if (resourcePath === "/" || target.pathname === resourcePath) {
    return true;
  }
  const prefix = resourcePath.endsWith("/") ? resourcePath : `${resourcePath}/`;
  return target.pathname.startsWith(prefix);
}

/**
 * Find a cached exchanged token for the protected resource a URL belongs to,
 * preferring the most specific resource.
 *
 * @param cache The session's token cache.
 * @param url The target URL.
 * @returns The token and its key (the protected resource identifier), if any.
 */
export function findCachedToken(
  cache: TokenCache,
  url: string,
): { key: string; token: TokenResponse } | undefined {
  let match: { key: string; token: TokenResponse } | undefined;
  for (const resource of [...cache.keys()]) {
    // get() skips expired entries.
    const token = cache.get(resource);
    if (
      token !== undefined &&
      isWithinResource(url, resource) &&
      (match === undefined || resource.length > match.key.length)
    ) {
      match = { key: resource, token };
    }
  }
  return match;
}
