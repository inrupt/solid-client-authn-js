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

async function buildAuthenticatedHeaders(
  targetUrl: string,
  authToken: string,
  dpopKey?: KeyPair,
  defaultOptions?: RequestInit
): Promise<RequestInit> {
  if (dpopKey !== undefined) {
    return buildDpopFetchOptions(targetUrl, authToken, dpopKey, defaultOptions);
  }
  return {
    ...defaultOptions,
    headers: {
      ...defaultOptions?.headers,
      Authorization: `Bearer ${authToken}`,
    },
  };
}

async function makeAuthenticatedRequest(
  unauthFetch: typeof fetch,
  accessToken: string,
  url: RequestInfo,
  defaultRequestInit?: RequestInit,
  dpopKey?: KeyPair
) {
  return unauthFetch(
    url,
    await buildAuthenticatedHeaders(
      url.toString(),
      accessToken,
      dpopKey,
      defaultRequestInit
    )
  );
}

async function refreshAccessToken(
  refreshOptions: RefreshOptions,
  dpopKey?: KeyPair
): Promise<{ accessToken: string; refreshToken?: string }> {
  const tokenSet = await refreshOptions.tokenRefresher.refresh(
    refreshOptions.sessionId,
    refreshOptions.refreshToken,
    dpopKey
  );
  if (typeof tokenSet.refreshToken === "string") {
    refreshOptions.eventEmitter?.emit(
      EVENTS.NEW_REFRESH_TOKEN,
      tokenSet.refreshToken
    );
  }
  return {
    accessToken: tokenSet.accessToken,
    refreshToken: tokenSet.refreshToken,
  };
}

/**
 * @param unauthFetch a regular fetch function, compliant with the WHATWG spec.
 * @param authToken an access token, either a Bearer token or a DPoP one.
 * @param options The option object may contain two objects: the DPoP key token
 * is bound to if applicable, and options to customise token renewal behaviour.
 *
 * @returns A fetch function that adds an appropriate Authorization header with
 * the provided token, and adds a DPoP header if applicable.
 */
export async function buildAuthenticatedFetch(
  unauthFetch: typeof fetch,
  accessToken: string,
  options?: {
    dpopKey?: KeyPair;
    refreshOptions?: RefreshOptions;
  }
): Promise<typeof fetch> {
  let currentAccessToken = accessToken;
  const currentRefreshOptions: RefreshOptions | undefined =
    options?.refreshOptions;
  return async (url, requestInit?): Promise<Response> => {
    let response = await makeAuthenticatedRequest(
      unauthFetch,
      currentAccessToken,
      url,
      requestInit,
      options?.dpopKey
    );

    const failedButNotExpectedAuthError =
      !response.ok && !isExpectedAuthError(response.status);
    if (response.ok || failedButNotExpectedAuthError) {
      // If there hasn't been a redirection, or if there has been a non-auth related
      // issue, it should be handled at the application level
      return response;
    }
    const hasBeenRedirected = response.url !== url;
    if (hasBeenRedirected && options?.dpopKey !== undefined) {
      // If the request failed for auth reasons, and has been redirected, we should
      // replay it generating a DPoP header for the rediration target IRI. This
      // doesn't apply to Bearer tokens, as the Bearer tokens aren't specific
      // to a given resource and method, while the DPoP header (associated to a
      // DPoP token) is.
      response = await makeAuthenticatedRequest(
        unauthFetch,
        currentAccessToken,
        // Replace the original target IRI (`url`) by the redirection target
        response.url,
        requestInit,
        options.dpopKey
      );
    }

    // If the redirected request still has an auth issue, the access token may
    // need to be refreshed.
    if (
      currentRefreshOptions !== undefined &&
      isExpectedAuthError(response.status)
    ) {
      // With currentRefreshOptions not being undefined, options is necessarily
      // defined, so it is fine to add a non-null assertion.
      /* eslint-disable @typescript-eslint/no-non-null-assertion */
      try {
        const { accessToken: refreshedAccessToken, refreshToken } =
          await refreshAccessToken(currentRefreshOptions, options!.dpopKey);
        // Update the tokens in the closure if appropriate.
        currentAccessToken = refreshedAccessToken;
        if (refreshToken !== undefined) {
          currentRefreshOptions.refreshToken = refreshToken;
        }
        // Once the token has been refreshed, re-issue the authenticated request.
        response = await makeAuthenticatedRequest(
          unauthFetch,
          currentAccessToken,
          response.url,
          requestInit,
          options!.dpopKey
        );
        /* eslint-enable @typescript-eslint/no-non-null-assertion */
      } catch (e) {
        // It is possible that an underlying library throws an error on refresh flow failure.
        // If we used a log framework, the error could be logged at the `debug` level,
        // but otherwise the failure of the refresh flow should not blow up in the user's
        // face, and returning the original authentication error is better.
        return response;
      }
    }
    // If the access token was refreshed and there is still an auth error, or if
    // no refresh token is provided, the user legitimately doesn't have access to
    // the resource and the response should simply be returned.
    return response;
  };
}
