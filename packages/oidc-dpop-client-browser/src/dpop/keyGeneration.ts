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

import { JWK } from "node-jose";
import { BasicParameters, ECCurve, JSONWebKey, OKPCurve } from "jose";

/**
 * Generates a Json Web Key
 * @param kty Key type
 * @param crvBitlength Curve length (only relevant for elliptic curve algorithms)
 * @param parameters
 * @hidden
 */
export async function generateJwk(
  kty: "EC" | "RSA",
  crvBitlength?: ECCurve | OKPCurve | number,
  parameters?: BasicParameters
): Promise<JSONWebKey> {
  const key = await JWK.createKey(kty, crvBitlength, parameters);
  return key.toJSON(true) as JSONWebKey;
}

/**
 * Generates a JSON Web Key suitable to be used to sign HTTP request headers.
 */
export async function generateJwkForDpop(): Promise<JSONWebKey> {
  return generateJwk("EC", "P-256", { alg: "ES256" });
}

/**
 * Generates a JSON Web Key based on the RSA algorithm
 */
export async function generateJwkRsa(): Promise<JSONWebKey> {
  return generateJwk("RSA");
}
