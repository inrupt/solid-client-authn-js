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
  JWT,
  JSONWebKey
} from "jose";
import IJoseUtility from "@solid/authenticator-core/dist/authenticator/IJoseUtility";
import NotImplementedError from "@solid/authenticator-core/dist/util/errors/NotImplementedError";

export default class NodeJoseUtility implements IJoseUtility {
  generateJWK(
    kty: "EC" | "OKP" | "RSA" | "oct",
    crvBitlength?: ECCurve | OKPCurve | number,
    parameters?: BasicParameters,
    isPrivate?: boolean
  ): Promise<JSONWebKey> {
    throw new NotImplementedError("nodeGenerateJWK");
  }
  privateJWKToPublicJWK(key: JSONWebKey): Promise<JSONWebKey> {
    throw new NotImplementedError("nodePrivateJWKToPublicJWK");
  }
  signJWT(
    payload: Object,
    key: JWKECKey | JWKOKPKey | JWKRSAKey | JWKOctKey,
    options?: JWT.SignOptions
  ): Promise<string> {
    throw new NotImplementedError("nodeSignJWT");
  }
}
