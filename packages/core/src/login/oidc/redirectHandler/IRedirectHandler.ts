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

// eslint-disable-next-line no-shadow
import { fetch } from "cross-fetch";
import {
  JWTPayload,
  jwtVerify,
  createRemoteJWKSet,
} from "@inrupt/jose-legacy-modules";
import { EventEmitter } from "events";
import IHandleable from "../../../util/handlerPattern/IHandleable";
import { ISessionInfo } from "../../../sessionInfo/ISessionInfo";

export type RedirectResult = ISessionInfo & { fetch: typeof fetch };
export type RedirectInput = [string, EventEmitter | undefined];

/**
 * @hidden
 */
type IRedirectHandler = IHandleable<
  // Tuple of the URL to redirect to, an optional event listener for when
  // we receive a new refresh token, and, an optional onError function:
  RedirectInput,
  RedirectResult
>;
export default IRedirectHandler;

type WithStack = { stack: string };

/**
 * Extract a WebID from an ID token payload based on https://github.com/solid/webid-oidc-spec.
 * Note that this does not yet implement the user endpoint lookup, and only checks
 * for `webid` or IRI-like `sub` claims.
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
  let payload: JWTPayload;
  try {
    const jwks = createRemoteJWKSet(new URL(jwksIri));
    const { payload: verifiedPayload } = await jwtVerify(idToken, jwks, {
      issuer: issuerIri,
      audience: clientId,
    });
    payload = verifiedPayload;
  } catch (e) {
    throw new Error(`ID token verification failed: ${(e as WithStack).stack}`);
  }

  if (typeof payload.webid === "string") {
    return payload.webid;
  }
  if (typeof payload.sub !== "string") {
    throw new Error(
      `The ID token ${JSON.stringify(
        payload
      )} is invalid: it has no 'webid' claim and no 'sub' claim.`
    );
  }
  try {
    // This parses the 'sub' claim to check if it is a well-formed IRI.
    // However, the normalized value isn't returned to make sure the WebID is returned
    // as specified by the Identity Provider.
    // eslint-disable-next-line no-new
    new URL(payload.sub);
    return payload.sub;
  } catch (e) {
    throw new Error(
      `The ID token has no 'webid' claim, and its 'sub' claim of [${payload.sub}] is invalid as a URL - error [${e}].`
    );
  }
}
