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

/**
 * @hidden
 * @packageDocumentation
 */

/**
 * Creates a DPoP JWT to be embedded in the header
 */
import URL from "url-parse";
import { inject, injectable } from "tsyringe";
import IJoseUtility from "../jose/IJoseUtility";
import { IDpopClientKeyManager } from "./DpopClientKeyManager";
import { IUuidGenerator } from "../util/UuidGenerator";
import {
  /*signJWT,*/ privateJWKToPublicJWK,
} from "../jose/IsomorphicJoseUtility";
import { signJWT } from "@inrupt/oidc-dpop-client-browser";
import { v4 } from "uuid";
import { JSONWebKey } from "jose";

export interface IDpopHeaderCreator {
  /**
   * Creates the Dpop Header token
   * @param audience The URL of the RS
   * @param method The HTTP method that is being used
   */
  createHeaderToken(audience: URL, method: string): Promise<string>;
}

/**
 * Normalizes a URL in order to generate the DPoP token based on a consistent scheme.
 * @param audience The URL to normalize.
 * @returns The normalized URL as a string.
 * @hidden
 */
export function normalizeHtu(audience: URL): string {
  return `${audience.origin}${audience.pathname}`;
}

/**
 * Creates a DPoP header according to https://tools.ietf.org/html/draft-fett-oauth-dpop-04,
 * based on the target URL and method, using the provided key.
 * @param audience Target URL.
 * @param method HTTP method allowed.
 * @param key Key used to sign the token.
 * @returns A JWT that can be used as a DPoP Authorization header.
 */
export async function createHeaderToken(
  audience: URL,
  method: string,
  key: JSONWebKey
): Promise<string> {
  return signJWT(
    {
      htu: normalizeHtu(audience),
      htm: method,
      jti: v4(),
    },
    key,
    {
      header: {
        jwk: privateJWKToPublicJWK(key),
        typ: "dpop+jwt",
      },
      expiresIn: "1 hour",
      algorithm: "ES256",
    }
  );
}

/**
 * @hidden
 */
@injectable()
export default class DpopHeaderCreator implements IDpopHeaderCreator {
  constructor(
    @inject("joseUtility") private joseUtility: IJoseUtility,
    @inject("dpopClientKeyManager")
    private dpopClientKeyManager: IDpopClientKeyManager,
    @inject("uuidGenerator") private uuidGenerator: IUuidGenerator
  ) {}

  public normalizeHtu = normalizeHtu;

  async createHeaderToken(audience: URL, method: string): Promise<string> {
    // TODO: update for multiple signing abilities
    const clientKey = await this.dpopClientKeyManager.getClientKey();

    if (clientKey === undefined) {
      throw new Error("Could not obtain the key to sign the token with.");
    }
    return createHeaderToken(audience, method, clientKey);
  }
}
