/**
 * Proprietary and Confidential
 *
 * Copyright 2020 Inrupt Inc. - all rights reserved.
 *
 * Do not use without explicit permission from Inrupt Inc.
 */

/**
 * Interface defining how each environment should define its crypto system
 */
import { ECCurve, BasicParameters, OKPCurve, JWT, JSONWebKey } from "jose";

export default interface IJoseUtility {
  /**
   * Generates a keystore
   * @param kty Type of key
   * @param crv A curve or bitlength
   * @param parameters Parameters to generate the key
   * @param isPrivate True if a private token should be generated
   */
  generateJWK(
    kty: "EC",
    crv?: ECCurve,
    parameters?: BasicParameters,
    isPrivate?: boolean
  ): Promise<JSONWebKey>;
  generateJWK(
    kty: "OKP",
    crv?: OKPCurve,
    parameters?: BasicParameters,
    isPrivate?: boolean
  ): Promise<JSONWebKey>;
  generateJWK(
    kty: "RSA",
    bitlength?: number,
    parameters?: BasicParameters,
    isPrivate?: boolean
  ): Promise<JSONWebKey>;
  generateJWK(
    kty: "oct",
    bitlength?: number,
    parameters?: BasicParameters
  ): Promise<JSONWebKey>;
  /**
   * Converts a privake key to a public key
   * @param jwk The given private key
   */
  privateJWKToPublicJWK(jwk: JSONWebKey): Promise<JSONWebKey>;

  /**
   * Decodes a JSON Web Token
   * @param token The encoded token
   */
  decodeJWT(token: string): Promise<Record<string, unknown>>;
  /**
   * Creates a JSON Web Token
   * @param payload Custom fields to be included
   * @param key Private JWK
   * @param options Common fields on tokens
   */
  signJWT(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: Record<string, any>,
    key: JSONWebKey,
    options?: JWT.SignOptions
  ): Promise<string>;

  generateCodeVerifier(): Promise<string>;

  generateCodeChallenge(verifier: string): Promise<string>;
}
