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

// eslint-disable-next-line no-shadow
import { fetch } from "cross-fetch";
import { EventEmitter } from "events";
import { ITokenRefresher } from "../login/oidc/refresh/ITokenRefresher";
import { createDpopHeader, KeyPair } from "./dpopUtils";
import { EVENTS } from "../constant";

export type RefreshOptions = {
  sessionId: string;
  refreshToken: string;
  tokenRefresher: ITokenRefresher;
  eventEmitter?: EventEmitter;
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
  unauthFetch: typeof fetch,
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
    const response = await unauthFetch(init, {
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
        currentRefreshOptions.refreshToken,
        undefined,
        currentRefreshOptions.eventEmitter
      );
      currentAccessToken = tokenSet.accessToken;
      if (tokenSet.refreshToken) {
        // If the refresh token is rotated, update it in the closure.
        currentRefreshOptions.refreshToken = tokenSet.refreshToken;
        currentRefreshOptions.eventEmitter?.emit(
          EVENTS.NEW_REFRESH_TOKEN,
          tokenSet.refreshToken
        );
      }
      // Once the token has been refreshed, re-issue the authenticated request.
      // If it has an auth failure again, the user legitimately doesn't have access
      // to the target resource.
      return await unauthFetch(init, {
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

async function buildDpopFetchOptions(
  targetUrl: string,
  authToken: string,
  dpopKey: KeyPair,
  defaultOptions?: RequestInit
): Promise<RequestInit> {
  const options: RequestInit = { ...defaultOptions };
  options.headers = {
    ...defaultOptions?.headers,
    Authorization: `DPoP ${authToken}`,
    DPoP: await createDpopHeader(
      targetUrl,
      defaultOptions?.method ?? "get",
      dpopKey
    ),
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
  unauthFetch: typeof fetch,
  accessToken: string,
  dpopKey: KeyPair,
  refreshOptions?: RefreshOptions
): Promise<typeof fetch> {
  let currentAccessToken = accessToken;
  const currentRefreshOptions: RefreshOptions | undefined = refreshOptions;
  return async (url, options): Promise<Response> => {
    let response = await unauthFetch(
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
      response = await unauthFetch(
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
          dpopKey,
          currentRefreshOptions.eventEmitter
        );
        currentAccessToken = tokenSet.accessToken;
        if (tokenSet.refreshToken) {
          // If the refresh token is rotated, update it in the closure.
          currentRefreshOptions.refreshToken = tokenSet.refreshToken;
          currentRefreshOptions.eventEmitter?.emit(
            EVENTS.NEW_REFRESH_TOKEN,
            tokenSet.refreshToken
          );
        }
        // Once the token has been refreshed, re-issue the authenticated request.
        // If it has an auth failure again, the user legitimately doesn't have access
        // to the target resource.
        return await unauthFetch(
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

/**
 * @param authToken a DPoP token.
 * @param dpopKey The private key the token is bound to.
 * @param
 * @returns A fetch function that adds an Authorization header with the provided
 * DPoP token, and adds a dpop header.
 */
export async function buildAuthenticatedFetch(
  unauthFetch: typeof fetch,
  accessToken: string,
  options?: {
    dpopKey?: KeyPair;
    refreshOptions?: RefreshOptions;
  }
): Promise<typeof fetch> {
  if (options?.dpopKey) {
    return buildDpopFetch(
      unauthFetch,
      accessToken,
      options.dpopKey,
      options.refreshOptions
    );
  }
  return buildBearerFetch(unauthFetch, accessToken, options?.refreshOptions);
}
