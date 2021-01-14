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

import { JSONWebKey } from "jose";
import { createDpopHeader } from "@inrupt/oidc-client-ext";

/**
 * @param authToken A bearer token.
 * @param _refreshToken An optional refresh token.
 * @returns A fetch function that adds an Authorization header with the provided
 * bearer token.
 * @hidden
 */
export function buildBearerFetch(
  authToken: string,
  // TODO: We need to push this refresh token into a wrapper around the fetch,
  //  so dependent on that wrapper existing first!
  _refreshToken: string | undefined
): typeof fetch {
  return (init, options): Promise<Response> => {
    return fetch(init, {
      ...options,
      credentials: "include",
      headers: {
        ...options?.headers,
        Authorization: `Bearer ${authToken}`,
      },
    });
  };
}

async function buildDpopFetchOptions(
  targetUrl: string,
  authToken: string,
  dpopKey: JSONWebKey,
  defaultOptions?: RequestInit
): Promise<RequestInit> {
  return {
    ...defaultOptions,
    headers: {
      ...defaultOptions?.headers,
      Authorization: `DPoP ${authToken}`,
      DPoP: await createDpopHeader(
        targetUrl,
        defaultOptions?.method ?? "get",
        dpopKey
      ),
    },
    credentials: "include",
  };
}

function isExpectedAuthError(statusCode: number): boolean {
  // As per https://tools.ietf.org/html/rfc7235#section-3.1 and https://tools.ietf.org/html/rfc7235#section-3.1,
  // a response failing because the provided credentials aren't accepted by the
  // server can get a 401 or a 403 response.
  return [401, 403].includes(statusCode);
}

/**
 * @param authToken a DPoP token.
 * @param _refreshToken An optional refresh token.
 * @param dpopKey The private key the token is bound to.
 * @returns A fetch function that adds an Authorization header with the provided
 * DPoP token, and adds a dpop header.
 */
export async function buildDpopFetch(
  authToken: string,
  // TODO: We need to push this refresh token into a wrapper around the fetch,
  //  so dependent on that wrapper existing first!
  _refreshToken: string | undefined,
  dpopKey: JSONWebKey
): Promise<typeof fetch> {
  return async (url, options): Promise<Response> => {
    const response = await fetch(
      url,
      await buildDpopFetchOptions(url.toString(), authToken, dpopKey, options)
    );
    const failedButNotExpectedAuthError =
      !response.ok && !isExpectedAuthError(response.status);
    const hasBeenRedirected = response.url !== url;
    if (response.ok || failedButNotExpectedAuthError || !hasBeenRedirected) {
      // If there hasn't been a redirection, or if there has been a non-auth related
      // issue, it should be handled at the application level
      return response;
    }
    // If the request failed for auth reasons, and has been redirected, we should
    // replay it with a new DPoP token.
    return fetch(
      response.url,
      await buildDpopFetchOptions(response.url, authToken, dpopKey, options)
    );
  };
}
