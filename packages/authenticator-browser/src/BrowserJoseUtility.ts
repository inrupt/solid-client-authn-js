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
} from 'jose'
import {
  JWK,
  JWS
} from 'node-jose'
import JWT from 'jsonwebtoken'
import IJoseUtility from '@solid/authenticator-core/dist/authenticator/IJoseUtility'

export default class BrowserJoseUtility implements IJoseUtility {
  async generateJWK (
    kty: 'EC' | 'OKP' | 'RSA' | 'oct',
    crvBitlength?: ECCurve | OKPCurve | number,
    parameters?: BasicParameters,
    isPrivate?: boolean
  ): Promise<JSONWebKey> {
    return (await JWK.createKey(kty, crvBitlength, parameters)) as JSONWebKey
  }

  async signJWT (
    payload: Object,
    key: JWKECKey | JWKOKPKey | JWKRSAKey | JWKOctKey,
    options?: JoseJWT.SignOptions
  ): Promise<string> {
    const convertedKey: string = (await JWK.asKey(key, ''))
    return JWT.sign(payload, convertedKey, options as JWT.SignOptions)
  }

  async privateJWKToPublicJWK (jwk: JSONWebKey): Promise<JSONWebKey> {
    return (await JWK.asKey(jwk as JWK.RawKey, 'public')) as JSONWebKey
  }
}
