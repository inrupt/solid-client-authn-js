/**
 * Jose utility compatible with the Web Browser
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
import IJoseUtility from "@solid/authenticator-core/dist/authenticator/IJoseUtility";

export default class BrowserJoseUtility implements IJoseUtility {
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
    payload: Object,
    key: JWKECKey | JWKOKPKey | JWKRSAKey | JWKOctKey,
    options?: JoseJWT.SignOptions
  ): Promise<string> {
    const parsedKey = await JWK.asKey(key);
    const convertedKey: string = parsedKey.toPEM(true);
    const signed = JWT.sign(payload, convertedKey, {
      ...(options as JWT.SignOptions)
    });
    return signed;
  }

  async privateJWKToPublicJWK(jwk: JSONWebKey): Promise<JSONWebKey> {
    return (await JWK.asKey(jwk as JWK.RawKey, "public")) as JSONWebKey;
  }
}
