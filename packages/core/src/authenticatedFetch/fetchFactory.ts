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

import type { EventEmitter } from "node:events";
import { REFRESH_BEFORE_EXPIRATION_SECONDS, EVENTS } from "../constant";
import type {
  ITokenRefresher,
  TokenEndpointResponse,
} from "../login/oidc/refresh/ITokenRefresher";
import type { KeyPair } from "./dpopUtils";
import { createDpopHeader } from "./dpopUtils";
import { OidcProviderError } from "../errors/OidcProviderError";
import { InvalidResponseError } from "../errors/InvalidResponseError";
import type {
  AuthorizationServerMetadata,
  ProtectedResourceMetadata,
  SUPPORTED_AUTHN_SCHEMES,
  TokenCache,
  TokenResponse,
} from "./reactiveAuth";
import {
  parseAuthnChallenge,
  isResourceMetadata,
  hasAuthServer,
  setAsMetaDefaults,
  isASMetadata,
  exchange,
  cacheKey,
  createTokenCache,
  getResourceMetadataCache,
  getAsMetadataCache,
  findCachedToken,
  asMetadataUrl,
  isWithinResource,
} from "./reactiveAuth";
import type { SessionTokenSet } from "../SessionEventListener";

export type RefreshOptions = {
  sessionId: string;
  refreshToken: string;
  tokenRefresher: ITokenRefresher;
};

/**
 * If expires_in isn't specified for the access token, we assume its lifetime is
 * 10 minutes.
 */
export const DEFAULT_EXPIRATION_TIME_SECONDS = 600;

function isExpectedAuthError(statusCode: number): boolean {
  // As per https://tools.ietf.org/html/rfc7235#section-3.1 and https://tools.ietf.org/html/rfc7235#section-3.1,
  // a response failing because the provided credentials aren't accepted by the
  // server can get a 401 or a 403 response.
  return [401, 403].includes(statusCode);
}

export type DpopHeaderPayload = {
  htu: string;
  htm: string;
  jti: string;
  ath?: string;
};

async function buildDpopFetchOptions(
  targetUrl: string,
  authToken: string,
  dpopKey: KeyPair,
  defaultOptions?: RequestInit,
): Promise<RequestInit> {
  const headers = new Headers(defaultOptions?.headers);
  // Any pre-existing Authorization header should be overriden.
  headers.set("Authorization", `DPoP ${authToken}`);
  headers.set(
    "DPoP",
    await createDpopHeader(
      targetUrl,
      defaultOptions?.method ?? "get",
      dpopKey,
      authToken,
    ),
  );
  return {
    ...defaultOptions,
    headers,
  };
}

async function buildAuthenticatedHeaders(
  targetUrl: string,
  authToken: string,
  dpopKey?: KeyPair,
  defaultOptions?: RequestInit,
): Promise<RequestInit> {
  if (dpopKey !== undefined) {
    return buildDpopFetchOptions(targetUrl, authToken, dpopKey, defaultOptions);
  }
  const headers = new Headers(defaultOptions?.headers);
  // Any pre-existing Authorization header should be overriden.
  headers.set("Authorization", `Bearer ${authToken}`);
  return {
    ...defaultOptions,
    headers,
  };
}

async function makeAuthenticatedRequest(
  accessToken: string,
  url: RequestInfo | URL,
  defaultRequestInit?: RequestInit,
  dpopKey?: KeyPair,
  unauthFetch = fetch,
) {
  return unauthFetch(
    url,
    await buildAuthenticatedHeaders(
      url.toString(),
      accessToken,
      dpopKey,
      defaultRequestInit,
    ),
  );
}

async function refreshAccessToken(
  refreshOptions: RefreshOptions,
  dpopKey?: KeyPair,
  eventEmitter?: EventEmitter,
): Promise<TokenEndpointResponse> {
  const tokenSet = await refreshOptions.tokenRefresher.refresh(
    refreshOptions.sessionId,
    refreshOptions.refreshToken,
    dpopKey,
  );
  eventEmitter?.emit(
    EVENTS.SESSION_EXTENDED,
    tokenSet.expiresIn ?? DEFAULT_EXPIRATION_TIME_SECONDS,
  );
  return tokenSet;
}

/**
 *
 * @param expiresIn Delay until the access token expires.
 * @returns a delay until the access token should be refreshed.
 */
const computeRefreshDelay = (expiresIn?: number): number => {
  if (expiresIn !== undefined) {
    return expiresIn - REFRESH_BEFORE_EXPIRATION_SECONDS > 0
      ? // We want to refresh the token 5 seconds before they actually expire.
        expiresIn - REFRESH_BEFORE_EXPIRATION_SECONDS
      : expiresIn;
  }
  return DEFAULT_EXPIRATION_TIME_SECONDS;
};

const toUrlString = (url: RequestInfo | URL): string => {
  if (typeof url === "string") {
    return url;
  }
  return url instanceof URL ? url.href : url.url;
};

const withTokenType = (token: TokenResponse, keyPair?: KeyPair) =>
  token.token_type === "DPoP" ? keyPair : undefined;

/**
 * How long an exchanged token may be cached, in milliseconds: until shortly before it expires.
 */
export const tokenCacheTtl = (token: TokenResponse): number =>
  ((token.expires_in ?? DEFAULT_EXPIRATION_TIME_SECONDS) -
    REFRESH_BEFORE_EXPIRATION_SECONDS) *
  1000;

async function discoverResourceMetadata(
  url: string,
  discoveryFetch: typeof fetch
): Promise<ProtectedResourceMetadata | undefined> {
  const key = cacheKey(url);
  if (key === undefined) {
    return undefined;
  }
  const cached = getResourceMetadataCache().get(key);
  if (cached !== undefined) {
    return cached;
  }
  const resourceMeta = await discoveryFetch(url)
    .then((response) => (response.ok ? response.json() : undefined))
    .then((json) => (isResourceMetadata(json) ? json : undefined))
    .catch((_) => {
      return undefined;
    });
  if (resourceMeta !== undefined) {
    getResourceMetadataCache().set(key, resourceMeta);
  }
  return resourceMeta;
}

async function discoverAsMetadata(
  authorizationServer: string,
  discoveryFetch: typeof fetch
): Promise<AuthorizationServerMetadata | undefined> {
  const key = cacheKey(authorizationServer);
  if (key === undefined) {
    return undefined;
  }
  const cached = getAsMetadataCache().get(key);
  if (cached !== undefined) {
    return cached;
  }
  const asUrl = asMetadataUrl(authorizationServer);
  const asMeta = await discoveryFetch(asUrl)
    .then((response) => (response.ok ? response.json() : undefined))
    .then((json) =>
      json !== null && typeof json === "object"
        ? setAsMetaDefaults(json)
        : json,
    )
    .then((json) => (isASMetadata(json) ? json : undefined))
    .catch((_) => {
      return undefined;
    });
  // RFC 8414 section 3.3: the issuer must be the identifier the metadata URL was built from,
  // otherwise the metadata must not be used.
  if (asMeta === undefined || asMeta.issuer !== authorizationServer) {
    return undefined;
  }
  getAsMetadataCache().set(key, asMeta);
  return asMeta;
}

/**
 * Discover the Protected Resource and Authorization Server
 * based on the authentication challenge.
 * 
 * @param unauthResponse  the response including the authentication challenge
 * @param schemes         the supported schemes, ordered by preference
 * @param options         options: a custom fetch for discovery
 * @returns metadata for the resource and authorization server for the first
 *  matching scheme, undefined if none match
 */
export async function reactiveDiscovery(
  requestUrl: string,
  unauthResponse: Response,
  schemes: (typeof SUPPORTED_AUTHN_SCHEMES)[number][],
  options?: Partial<{
    customFetch: typeof fetch;
  }>
): Promise<{
  resourceMetadata: ProtectedResourceMetadata,
  authServerMetadata: AuthorizationServerMetadata
} | undefined> {
  const discoveryFetch = options?.customFetch !== undefined
    ? options?.customFetch
    : fetch;
  // Discovery
  if (!unauthResponse.headers.has("WWW-Authenticate")) {
    return undefined;
  }
  const challenges = parseAuthnChallenge(
    unauthResponse.headers.get("WWW-Authenticate") as string,
  );
  const resourceMetadataUrl = schemes
    .map(scheme => challenges[scheme])
    .map((params) => params?.resource_metadata)
    .find((url) => url !== undefined);

  if (resourceMetadataUrl === undefined) {
    return undefined;
  }
  const resourceMeta = await discoverResourceMetadata(resourceMetadataUrl, discoveryFetch);
  if (
    resourceMeta === undefined ||
    !hasAuthServer(resourceMeta) ||
    resourceMeta.authorization_servers.length === 0
  ) {
    return undefined;
  }
  // Native clients will not set the Response.url.
  const challengerUrl = unauthResponse.url === "" ? requestUrl : unauthResponse.url;
  // RFC 9728 section 3.3: the metadata must describe the resource being accessed, otherwise
  // it must not be used. This enforces it for both the original request target, and
  // the potentially redirected final resource which sent the authentication challenge.
  if (
    !isWithinResource(requestUrl, resourceMeta.resource) ||
    !isWithinResource(challengerUrl, resourceMeta.resource)
  ) {
    return undefined;
  }
  const asMeta = await discoverAsMetadata(
    resourceMeta.authorization_servers[0],
    discoveryFetch
  );
  if (
    asMeta === undefined
  ) {
    return undefined;
  }
  return {
    authServerMetadata: asMeta,
    resourceMetadata: resourceMeta
  }
}

/**
 * Based on the authentication challenge of an unauthorized request,
 * discover supported authentication mechanism and authenticate if
 * possible.
 *
 * @param unauthResponse  the original unauthorized response
 * @param idToken         the ID Token for the user, exchanged for an access token to the target resource
 * @param url             the original request URL
 * @param tokenCache      the session's cache of exchanged tokens
 * @param requestInit     the original request parameters
 * @param keyPair         the DPoP key the token is bound to (if any)
 * @param _fetch          an unauthenticated fetch
 * @returns the HTTP response, either unauthorized or after an attempted authentication
 */
async function reactiveAuth(
  unauthResponse: Response,
  idToken: string | undefined,
  url: RequestInfo | URL,
  tokenCache: TokenCache,
  requestInit?: RequestInit,
  keyPair?: KeyPair,
  _fetch?: typeof fetch,
): Promise<Response> {
  // Without an ID token, there is nothing to exchange for an access token.
  if (idToken === undefined) {
    return unauthResponse;
  }
  // Prefer the DPoP scheme if a key is present.
  const schemes: (typeof SUPPORTED_AUTHN_SCHEMES)[number][] =
    keyPair !== undefined
      ? ["DPoP", "Bearer"]
      : ["Bearer"];
  // Discovery
  const discoveredMeta = await reactiveDiscovery(
    toUrlString(url),
    unauthResponse,
    schemes, {
      customFetch: _fetch
    }
  );
  if (discoveredMeta === undefined ||
    !discoveredMeta.authServerMetadata.grant_types_supported.includes(
      "urn:ietf:params:oauth:grant-type:token-exchange",
  )) {
    return unauthResponse;
  }
  // Token exchange. There is no cached token for this resource at this point: the resource
  // covers the requested URL, so a cached token would have been used before the request.
  try {
    const tokens = await exchange(
      idToken,
      discoveredMeta.authServerMetadata.token_endpoint,
      discoveredMeta.authServerMetadata.issuer,
      discoveredMeta.resourceMetadata.resource,
      keyPair, {
        customFetch: _fetch
      }
    );
    const ttl = tokenCacheTtl(tokens);
    const key = cacheKey(discoveredMeta.resourceMetadata.resource);
    if (key !== undefined && ttl > 0) {
      tokenCache.set(key, tokens, { ttl });
    }
    return await makeAuthenticatedRequest(
      tokens.access_token,
      url,
      requestInit,
      withTokenType(tokens, keyPair),
      _fetch,
    );
  } catch (_) {
    return unauthResponse;
  }
}

/**
 * The tokens an authenticated fetch is built from.
 */
export type AuthenticatedFetchTokens = Pick<
  SessionTokenSet,
  "idToken" | "refreshToken" | "dpopKey"
> & {
  /**
   * The access token sent with each request.
   */
  accessToken: string;
  /**
   * Delay until the access token expires, in seconds. Takes precedence over `expiresAt`.
   */
  expiresIn?: number;
  /**
   * Expiration date of the access token, in seconds since the epoch.
   */
  expiresAt?: number;
};

export type AuthenticatedFetchOptions = {
  /**
   * Required to refresh the tokens before they expire, together with a refresh token.
   */
  refreshOptions?: Omit<RefreshOptions, "refreshToken">;
  eventEmitter?: EventEmitter;
  /**
   * A custom fetch function (defaults to the global fetch).
   */
  fetch?: typeof fetch;
};

const computeExpiresIn = (
  tokens: AuthenticatedFetchTokens,
): number | undefined => {
  if (tokens.expiresIn !== undefined) {
    return tokens.expiresIn;
  }
  if (tokens.expiresAt !== undefined) {
    return tokens.expiresAt - Math.trunc(Date.now() / 1000);
  }
  return undefined;
};

/**
 * Build a fetch function authenticated with the provided tokens.
 *
 * The access token is sent with each request, bound to the DPoP key if one is provided.
 * If the target resource rejects it and advertises its protected resource metadata,
 * the ID token is exchanged for an access token to that resource (RFC 8693).
 * If refresh options and a refresh token are provided, the whole token set is refreshed
 * before the access token expires.
 *
 * @param tokens The session tokens.
 * @param options Refresh options, event emitter and custom fetch.
 * @returns A fetch function that adds an appropriate Authorization header with
 * the access token, and adds a DPoP header if applicable.
 */
export function authenticateFetch(
  tokens: AuthenticatedFetchTokens,
  options?: AuthenticatedFetchOptions,
): typeof fetch {
  // Mutable token state, rotated on refresh.
  const current = {
    accessToken: tokens.accessToken,
    idToken: tokens.idToken,
    refreshToken: tokens.refreshToken,
  };
  const { dpopKey } = tokens;
  // Tokens exchanged through reactive authentication, specific to this session.
  const tokenCache = createTokenCache();
  const emitter = options?.eventEmitter;
  const refreshOptions = options?.refreshOptions;
  const expiresIn = computeExpiresIn(tokens);
  let latestTimeout: Parameters<typeof clearTimeout>[0];
  // Setup the refresh timeout outside of the authenticated fetch, so that
  // an idle app will not get logged out if it doesn't issue a fetch before
  // the first expiration date.
  if (refreshOptions !== undefined && current.refreshToken !== undefined) {
    const proactivelyRefreshToken = async () => {
      try {
        const refreshed = await refreshAccessToken(
          {
            ...refreshOptions,
            refreshToken: current.refreshToken as string,
          },
          dpopKey,
          emitter,
        );
        // Rotate the whole token set. Refresh responses may omit the ID token
        // (OpenID Connect Core, section 12.2), in which case the previous one is kept.
        current.accessToken = refreshed.accessToken;
        if (
          refreshed.idToken !== undefined &&
          refreshed.idToken !== current.idToken
        ) {
          // Exchanged tokens were obtained with the previous ID token.
          tokenCache.clear();
          current.idToken = refreshed.idToken;
        }
        if (refreshed.refreshToken !== undefined) {
          current.refreshToken = refreshed.refreshToken;
        }
        // Each time the access token is refreshed, we must plan for the next
        // refresh iteration.
        clearTimeout(latestTimeout);
        latestTimeout = setTimeout(
          proactivelyRefreshToken,
          computeRefreshDelay(refreshed.expiresIn) * 1000,
        );
        emitter?.emit(EVENTS.TIMEOUT_SET, latestTimeout);
      } catch (e) {
        // It is possible that an underlying library throws an error on refresh flow failure.
        // If we used a log framework, the error could be logged at the `debug` level,
        // but otherwise the failure of the refresh flow should not blow up in the user's
        // face, so we just swallow the error.
        if (e instanceof OidcProviderError) {
          // The OIDC provider refused to refresh the access token and returned an error instead.
          /* istanbul ignore next 100% coverage would require testing that nothing
              happens here if the emitter is undefined, which is more cumbersome
              than what it's worth. */
          emitter?.emit(EVENTS.ERROR, e.error, e.errorDescription);
          /* istanbul ignore next 100% coverage would require testing that nothing
            happens here if the emitter is undefined, which is more cumbersome
            than what it's worth. */
          emitter?.emit(EVENTS.SESSION_EXPIRED);
        }
        if (
          e instanceof InvalidResponseError &&
          e.missingFields.includes("access_token")
        ) {
          // In this case, the OIDC provider returned a non-standard response, but
          // did not specify that it was an error. We cannot refresh nonetheless.
          /* istanbul ignore next 100% coverage would require testing that nothing
            happens here if the emitter is undefined, which is more cumbersome
            than what it's worth. */
          emitter?.emit(EVENTS.SESSION_EXPIRED);
        }
      }
    };
    latestTimeout = setTimeout(
      proactivelyRefreshToken,
      computeRefreshDelay(expiresIn) * 1000,
    );

    emitter?.emit(EVENTS.TIMEOUT_SET, latestTimeout);
  } else if (emitter !== undefined) {
    // If no refresh options are provided, the session expires when the access token does.
    const expirationTimeout = setTimeout(
      () => {
        emitter.emit(EVENTS.SESSION_EXPIRED);
      },
      computeRefreshDelay(expiresIn) * 1000,
    );
    emitter.emit(EVENTS.TIMEOUT_SET, expirationTimeout);
  }
  return async (url, requestInit?): Promise<Response> => {
    // If a token was already exchanged for the target resource, use it directly
    // to avoid the round trip through reactive authentication.
    const cached = findCachedToken(tokenCache, toUrlString(url));
    if (cached !== undefined) {
      const cachedResponse = await makeAuthenticatedRequest(
        cached.token.access_token,
        url,
        requestInit,
        withTokenType(cached.token, dpopKey),
        options?.fetch,
      );
      if (!isExpectedAuthError(cachedResponse.status)) {
        return cachedResponse;
      }
      // The cached token is no longer accepted: start over with the session token.
      tokenCache.delete(cached.key);
    }
    let response = await makeAuthenticatedRequest(
      current.accessToken,
      url,
      requestInit,
      dpopKey,
      options?.fetch,
    );

    const failedButNotExpectedAuthError =
      !response.ok && !isExpectedAuthError(response.status);
    if (response.ok || failedButNotExpectedAuthError) {
      // If there hasn't been a redirection, or if there has been a non-auth related
      // issue, it should be handled at the application level
      return response;
    }
    const hasBeenRedirected = response.url !== url;
    if (hasBeenRedirected && dpopKey !== undefined) {
      // If the request failed for auth reasons, and has been redirected, we should
      // replay it generating a DPoP header for the rediration target IRI. This
      // doesn't apply to Bearer tokens, as the Bearer tokens aren't specific
      // to a given resource and method, while the DPoP header (associated to a
      // DPoP token) is.
      response = await makeAuthenticatedRequest(
        current.accessToken,
        // Replace the original target IRI (`url`) by the redirection target
        response.url,
        requestInit,
        dpopKey,
        options?.fetch,
      );
      if (!isExpectedAuthError(response.status)) {
        // Reactive authentication only applies to auth errors.
        return response;
      }
    }
    return reactiveAuth(
      response,
      current.idToken,
      url,
      tokenCache,
      requestInit,
      dpopKey,
      options?.fetch,
    );
  };
}

/**
 * @param accessToken an access token, either a Bearer token or a DPoP one.
 * @param options The option object may contain two objects: the DPoP key token
 * is bound to if applicable, and options to customize token renewal behavior.
 * @param {string} [options.idToken] The ID token, exchanged for an access token to resources
 * which reject the access token. Without it, no token exchange is attempted.
 * @param {typeof fetch} [options.fetch=fetch] A custom fetch function (defaults to the global fetch).
 *
 * @returns A fetch function that adds an appropriate Authorization header with
 * the provided token, and adds a DPoP header if applicable.
 * @deprecated Use {@link authenticateFetch} instead.
 */
export function buildAuthenticatedFetch(
  accessToken: string,
  options?: {
    idToken?: string;
    dpopKey?: KeyPair;
    refreshOptions?: RefreshOptions;
    expiresIn?: number;
    eventEmitter?: EventEmitter;
    fetch?: typeof fetch; // optional custom fetch
  },
): typeof fetch {
  return authenticateFetch(
    {
      accessToken,
      idToken: options?.idToken,
      dpopKey: options?.dpopKey,
      refreshToken: options?.refreshOptions?.refreshToken,
      expiresIn: options?.expiresIn,
    },
    {
      refreshOptions:
        options?.refreshOptions !== undefined
          ? {
              sessionId: options.refreshOptions.sessionId,
              tokenRefresher: options.refreshOptions.tokenRefresher,
            }
          : undefined,
      eventEmitter: options?.eventEmitter,
      fetch: options?.fetch,
    },
  );
}
