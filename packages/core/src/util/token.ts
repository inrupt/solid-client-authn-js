//
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

// eslint-disable-next-line no-shadow
import type { JWTPayload } from "jose";
import { jwtVerify, createRemoteJWKSet } from "jose";

type WithStack = { stack: string };

/**
 * Extract a WebID and the clientID from an ID token payload based on https://github.com/solid/webid-oidc-spec.
 * Note that this does not yet implement the user endpoint lookup, and only checks
 * for `webid`, `azp` or IRI-like `sub` claims.
 *
 * @param idToken the payload of the ID token from which the WebID can be extracted.
 * @returns an object with entries webId and clientId extracted from the ID token.
 * @internal
 */
export async function getWebidFromTokenPayload(
  idToken: string,
  jwksIri: string,
  issuerIri: string,
  clientId: string,
): Promise<{ webId: string; clientId?: string }> {
  let payload: JWTPayload;
  let clientIdInPayload: string | undefined;
  try {
    const { payload: verifiedPayload } = await jwtVerify(
      idToken,
      createRemoteJWKSet(new URL(jwksIri)),
      {
        issuer: issuerIri,
        audience: clientId,
      },
    );
    payload = verifiedPayload;
  } catch (e) {
    throw new Error(`Token verification failed: ${(e as WithStack).stack}`);
  }

  if (typeof payload.azp === "string") {
    clientIdInPayload = payload.azp;
  }
  if (typeof payload.webid === "string") {
    return {
      webId: payload.webid,
      clientId: clientIdInPayload,
    };
  }
  if (typeof payload.sub !== "string") {
    throw new Error(
      `The token ${JSON.stringify(
        payload,
      )} is invalid: it has no 'webid' claim and no 'sub' claim.`,
    );
  }
  try {
    // This parses the 'sub' claim to check if it is a well-formed IRI.
    // However, the normalized value isn't returned to make sure the WebID is returned
    // as specified by the Identity Provider.
    // eslint-disable-next-line no-new
    new URL(payload.sub);
    return {
      webId: payload.sub,
      clientId: clientIdInPayload,
    };
  } catch (e) {
    throw new Error(
      `The token has no 'webid' claim, and its 'sub' claim of [${payload.sub}] is invalid as a URL - error [${e}].`,
    );
  }
}
