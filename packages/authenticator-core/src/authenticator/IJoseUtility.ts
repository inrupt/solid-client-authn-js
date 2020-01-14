import {
  ECCurve,
  BasicParameters,
  OKPCurve,
  JWT,
  JSONWebKey
} from 'jose'

export default interface IJoseUtility {
  generateJWK (
    kty: 'EC',
    crv?: ECCurve,
    parameters?: BasicParameters,
    isPrivate?: boolean
  ): Promise<JSONWebKey>
  generateJWK (
    kty: 'OKP',
    crv?: OKPCurve,
    parameters?: BasicParameters,
    isPrivate?: boolean
  ): Promise<JSONWebKey>
  generateJWK (
    kty: 'RSA',
    bitlength?: number,
    parameters?: BasicParameters,
    isPrivate?: boolean
  ): Promise<JSONWebKey>
  generateJWK (
    kty: 'oct',
    bitlength?: number,
    parameters?: BasicParameters
  ): Promise<JSONWebKey>
  signJWT (
    payload: Object,
    key: JSONWebKey,
    options?: JWT.SignOptions
  ): Promise<string>
}
