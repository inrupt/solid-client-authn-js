import {
  JWKECKey,
  ECCurve,
  BasicParameters,
  OKPCurve,
  JWKOKPKey,
  JWKRSAKey,
  JWKOctKey,
  JWT
} from 'jose'

export default interface IJoseUtility {
  generateJWK (
    kty: 'EC',
    crv?: ECCurve,
    parameters?: BasicParameters,
    isPrivate?: boolean
  ): Promise<JWKECKey>
  generateJWK (
    kty: 'OKP',
    crv?: OKPCurve,
    parameters?: BasicParameters,
    isPrivate?: boolean
  ): Promise<JWKOKPKey>
  generateJWK (
    kty: 'RSA',
    bitlength?: number,
    parameters?: BasicParameters,
    isPrivate?: boolean
  ): Promise<JWKRSAKey>
  generateJWK (
    kty: 'oct',
    bitlength?: number,
    parameters?: BasicParameters
  ): Promise<JWKOctKey>
  signJWT (
    payload: Object,
    key: JWKECKey | JWKOKPKey | JWKRSAKey | JWKOctKey,
    options?: JWT.SignOptions
  ): Promise<string>
}
