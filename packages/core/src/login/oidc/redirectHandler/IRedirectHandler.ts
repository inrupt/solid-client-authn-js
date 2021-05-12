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

/**
 * @hidden
 * @packageDocumentation
 */

import type { fetch } from "cross-fetch";
import { jwtVerify } from "jose/jwt/verify";
import { createRemoteJWKSet } from "jose/jwks/remote";
import IHandleable from "../../../util/handlerPattern/IHandleable";
import { ISessionInfo } from "../../../sessionInfo/ISessionInfo";

export type RedirectResult = ISessionInfo & { fetch: typeof fetch };

/**
 * @hidden
 */
type IRedirectHandler = IHandleable<
  // Tuple of the URL to redirect to, and optionally an event listener for when
  // we receive a new refresh token:
  [string, ((newToken: string) => unknown)?],
  RedirectResult
>;
export default IRedirectHandler;

/**
 * Extract a WebID from an ID token payload based on https://github.com/solid/webid-oidc-spec.
 * Note that this does not yet implement the user endpoint lookup, and only checks
 * for webid or IRI-like sub claims.
 *
 * @param idToken the payload of the ID token from which the WebID can be extracted.
 * @returns a WebID extracted from the ID token.
 * @internal
 */
export async function getWebidFromTokenPayload(
  idToken: string,
  jwksIri: string,
  issuerIri: string,
  clientId: string
): Promise<string> {
  const jwks = createRemoteJWKSet(new URL(jwksIri));
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: issuerIri,
    audience: clientId,
  });
  if (typeof payload.webid === "string") {
    return payload.webid;
  }
  try {
    if (typeof payload.sub !== "string") {
      throw new Error(
        `The ID token ${JSON.stringify(
          payload
        )} is invalid: it has no 'webid' claim and no 'sub' claim.`
      );
    }
    const webid = new URL(payload.sub);
    return webid.href;
  } catch (e) {
    throw new Error(
      `The ID token has no 'webid' claim, and its 'sub' claim of [${payload.sub}] is invalid as a URL - error [${e}].`
    );
  }
}
