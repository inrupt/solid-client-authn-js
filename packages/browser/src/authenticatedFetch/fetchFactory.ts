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

import URL from "url-parse";
import { JSONWebKey } from "jose";
import { createHeaderToken } from "../dpop/DpopHeaderCreator";
import { fetch } from "cross-fetch";

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
      headers: {
        ...options?.headers,
        Authorization: `Bearer ${authToken}`,
      },
    });
  };
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
  return async (init, options): Promise<Response> => {
    return fetch(init, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: `DPoP ${authToken}`,
        DPoP: await createHeaderToken(
          new URL(init.toString()),
          options?.method ?? "get",
          dpopKey
        ),
      },
    });
  };
}
