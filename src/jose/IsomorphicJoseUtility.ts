/**
 * File for NodeJS-compatible JOSE
 */
import {
  JWKECKey,
  ECCurve,
  BasicParameters,
  OKPCurve,
  JWKOKPKey,
  JWKRSAKey,
  JWKOctKey,
  JWT as JoseJWT,
  JSONWebKey
} from "jose";
import JWT from "jsonwebtoken";
import IJoseUtility from "./IJoseUtility";
import randomString from "crypto-random-string";
import crypto from "crypto";
import { generateKey, exportKey } from "jwk-lite";
import jwkToPem from "jwk-to-pem";

export default class IsomorphicJoseUtility implements IJoseUtility {
  async generateJWK(
    kty: "EC" | "OKP" | "RSA" | "oct",
    crvBitlength?: ECCurve | OKPCurve | number,
    parameters?: BasicParameters
  ): Promise<JSONWebKey> {
    const keys = await generateKey("RS256", {
      modulusLength: 2048,
      usages: ["sign"]
    });
    const privateKey = await exportKey(keys.privateKey);
    return privateKey;
    // const key = await JWK.createKey(kty, crvBitlength, parameters);
    // return key.toJSON(true) as JSONWebKey;
  }

  async signJWT(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: Record<string, any>,
    key: JSONWebKey,
    options?: JoseJWT.SignOptions
  ): Promise<string> {
    const convertedKey: string = jwkToPem(key as jwkToPem.JWK);
    const signed = JWT.sign(payload, convertedKey, {
      ...(options as JWT.SignOptions)
    });
    return signed;
  }

  // TODO: also should have functionality to validate the token
  async decodeJWT(token: string): Promise<Record<string, unknown>> {
    return JWT.decode(token) as Promise<Record<string, unknown>>;
  }

  async privateJWKToPublicJWK(key: JSONWebKey): Promise<JSONWebKey> {
    // TODO refactor out
    return {
      kty: key.kty,
      use: key.use,
      // eslint-disable-next-line @typescript-eslint/camelcase
      key_ops: key.key_ops,
      kid: key.kid,
      alg: key.alg
    } as JSONWebKey;
  }

  async generateCodeVerifier(): Promise<string> {
    return randomString({ length: 10, type: "base64" });
  }

  async generateCodeChallenge(verifier: string): Promise<string> {
    const hash = crypto.createHash("sha256");
    hash.update(verifier);
    return hash
      .digest()
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  }
}
