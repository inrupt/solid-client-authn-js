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

import { JWK, JWT } from "jose";
import { fetch } from "cross-fetch";
import { v4 } from "uuid";
import { ITokenRefresher } from "../login/oidc/refresh/TokenRefresher";

export type RefreshOptions = {
  sessionId: string;
  refreshToken: string;
  tokenRefresher: ITokenRefresher;
  onNewRefreshToken?: (token: string) => unknown;
};

function isExpectedAuthError(statusCode: number): boolean {
  // As per https://tools.ietf.org/html/rfc7235#section-3.1 and https://tools.ietf.org/html/rfc7235#section-3.1,
  // a response failing because the provided credentials aren't accepted by the
  // server can get a 401 or a 403 response.
  return [401, 403].includes(statusCode);
}

/**
 * @param accessToken A bearer token.
 * @param refreshToken An optional refresh token.
 * @returns A fetch function that adds an Authorization header with the provided
 * bearer token.
 * @hidden
 */
export function buildBearerFetch(
  accessToken: string,
  refreshOptions?: RefreshOptions
): typeof fetch {
  // These local copies of the the provided parameters may be mutated in the
  // authenticated fetch closure.
  let currentAccessToken = accessToken;
  const currentRefreshOptions: RefreshOptions | undefined = refreshOptions
    ? { ...refreshOptions }
    : undefined;
  return async (
    init: RequestInfo,
    options?: RequestInit
  ): Promise<Response> => {
    const response = await fetch(init, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: `Bearer ${currentAccessToken}`,
      },
    });
    if (
      !isExpectedAuthError(response.status) ||
      currentRefreshOptions === undefined
    ) {
      // Either the request succeeded, or its failure isn't auth-related, or
      // no refresh token has been provided.
      return response;
    }
    try {
      const tokenSet = await currentRefreshOptions.tokenRefresher.refresh(
        currentRefreshOptions.sessionId,
        currentRefreshOptions.refreshToken
      );
      currentAccessToken = tokenSet.access_token;
      if (tokenSet.refresh_token) {
        // If the refresh token is rotated, update it in the closure.
        currentRefreshOptions.refreshToken = tokenSet.refresh_token;
        if (typeof currentRefreshOptions.onNewRefreshToken === "function") {
          currentRefreshOptions.onNewRefreshToken(tokenSet.refresh_token);
        }
      }
      // Once the token has been refreshed, re-issue the authenticated request.
      // If it has an auth failure again, the user legitimately doesn't have access
      // to the target resource.
      return fetch(init, {
        ...options,
        headers: {
          ...options?.headers,
          Authorization: `Bearer ${currentAccessToken}`,
        },
      });
    } catch (e) {
      // If we used a log framework, the error could be logged at the `debug` level,
      // but otherwise the failure of the refresh flow should not blow up in the user's
      // face, and returning the original authentication error is better.
      return response;
    }
  };
}

export type DpopHeaderPayload = {
  htu: string;
  htm: string;
  jti: string;
};

/**
 * Normalizes a URL in order to generate the DPoP token based on a consistent scheme.
 *
 * @param audience The URL to normalize.
 * @returns The normalized URL as a string.
 * @hidden
 */
export function normalizeHttpUriClaim(audience: string): string {
  const cleanedAudience = new URL(audience);
  cleanedAudience.hash = "";
  cleanedAudience.username = "";
  cleanedAudience.password = "";
  return cleanedAudience.toString();
}

/**
 * Creates a DPoP header according to https://tools.ietf.org/html/draft-fett-oauth-dpop-04,
 * based on the target URL and method, using the provided key.
 *
 * @param audience Target URL.
 * @param method HTTP method allowed.
 * @param key Key used to sign the token.
 * @returns A JWT that can be used as a DPoP Authorization header.
 */
export function createDpopHeader(
  audience: string,
  method: string,
  key: JWK.ECKey
): string {
  return JWT.sign(
    {
      htu: normalizeHttpUriClaim(audience),
      htm: method.toUpperCase(),
      jti: v4(),
    },
    key,
    {
      header: {
        jwk: key.toJWK(false),
        typ: "dpop+jwt",
      },
      algorithm: "ES256",
    }
  );
}

async function buildDpopFetchOptions(
  targetUrl: string,
  authToken: string,
  dpopKey: JWK.ECKey,
  defaultOptions?: RequestInit
): Promise<RequestInit> {
  const options: RequestInit = { ...defaultOptions };
  options.headers = {
    ...defaultOptions?.headers,
    Authorization: `DPoP ${authToken}`,
    DPoP: createDpopHeader(targetUrl, defaultOptions?.method ?? "get", dpopKey),
  };
  return options;
}

/**
 * @param authToken a DPoP token.
 * @param _refreshToken An optional refresh token.
 * @param dpopKey The private key the token is bound to.
 * @returns A fetch function that adds an Authorization header with the provided
 * DPoP token, and adds a dpop header.
 */
export async function buildDpopFetch(
  accessToken: string,
  dpopKey: JWK.ECKey,
  refreshOptions?: RefreshOptions
): Promise<typeof fetch> {
  let currentAccessToken = accessToken;
  const currentRefreshOptions: RefreshOptions | undefined = refreshOptions;
  return async (url, options): Promise<Response> => {
    let response = await fetch(
      url,
      await buildDpopFetchOptions(
        url.toString(),
        currentAccessToken,
        dpopKey,
        options
      )
    );
    const failedButNotExpectedAuthError =
      !response.ok && !isExpectedAuthError(response.status);
    const hasBeenRedirected = response.url !== url;
    if (response.ok || failedButNotExpectedAuthError) {
      // If there hasn't been a redirection, or if there has been a non-auth related
      // issue, it should be handled at the application level
      return response;
    }
    if (hasBeenRedirected) {
      // If the request failed for auth reasons, and has been redirected, we should
      // replay it with a new DPoP token.
      response = await fetch(
        response.url,
        await buildDpopFetchOptions(
          response.url,
          currentAccessToken,
          dpopKey,
          options
        )
      );
    }
    // If the redirected request has an auth issue, the access token may
    // need to be refreshed.
    if (
      currentRefreshOptions !== undefined &&
      isExpectedAuthError(response.status)
    ) {
      try {
        const tokenSet = await currentRefreshOptions.tokenRefresher.refresh(
          currentRefreshOptions.sessionId,
          currentRefreshOptions.refreshToken,
          dpopKey
        );
        currentAccessToken = tokenSet.access_token;
        if (tokenSet.refresh_token) {
          // If the refresh token is rotated, update it in the closure.
          currentRefreshOptions.refreshToken = tokenSet.refresh_token;
          if (typeof currentRefreshOptions.onNewRefreshToken === "function") {
            currentRefreshOptions.onNewRefreshToken(tokenSet.refresh_token);
          }
        }
        // Once the token has been refreshed, re-issue the authenticated request.
        // If it has an auth failure again, the user legitimately doesn't have access
        // to the target resource.
        return fetch(
          url.toString(),
          await buildDpopFetchOptions(
            url.toString(),
            currentAccessToken,
            dpopKey,
            options
          )
        );
      } catch (e) {
        // If we used a log framework, the error could be logged at the `debug` level,
        // but otherwise the failure of the refresh flow should not blow up in the user's
        // face, and returning the original authentication error is better.
        return response;
      }
    }
    // If there was an auth error, but no refresh token is provided, the response
    // should simply be returned
    return response;
  };
}
