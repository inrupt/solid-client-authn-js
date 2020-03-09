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
import { JWK, JWS } from "node-jose";
import JWT from "jsonwebtoken";
import IJoseUtility from "./IJoseUtility";

export default class IsomorphicJoseUtility implements IJoseUtility {
  async generateJWK(
    kty: "EC" | "OKP" | "RSA" | "oct",
    crvBitlength?: ECCurve | OKPCurve | number,
    parameters?: BasicParameters,
    isPrivate?: boolean
  ): Promise<JSONWebKey> {
    const key = await JWK.createKey(kty, crvBitlength, parameters);
    return key.toJSON(true) as JSONWebKey;
  }

  async signJWT(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: Record<string, any>,
    key: JWKECKey | JWKOKPKey | JWKRSAKey | JWKOctKey,
    options?: JoseJWT.SignOptions
  ): Promise<string> {
    const parsedKey = await JWK.asKey(key);
    const convertedKey: string = parsedKey.toPEM(true);
    console.log(options);
    const signed = JWT.sign(payload, convertedKey, {
      ...(options as JWT.SignOptions)
    });
    return signed;
  }

  async privateJWKToPublicJWK(key: JSONWebKey): Promise<JSONWebKey> {
    return (await JWK.asKey(key as JWK.RawKey, "public")) as JSONWebKey;
  }
}
