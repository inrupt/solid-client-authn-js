import IJoseUtility from "../IJoseUtility";
import { BasicParameters, ECCurve, OKPCurve, JSONWebKey, JWT } from "jose";

export const JoseUtilityMockGenerateJWKResponse: JSONWebKey = {
  kty: "RSA",
  e: "abcd",
  n: "1234"
};

export const JoseUtilityMockPrivateJWKToPublicJWKResponse: JSONWebKey = {
  kty: "RSA",
  e: "publicabcd",
  n: "public1234"
};

export const JoseUtilityMockSignJWTResponse = "thisIsAKey";

export const JoseUtilityMock: jest.Mocked<IJoseUtility> = {
  // There's an `as any` cast here because the overload with different parameter lengths of
  // generateJWK is tripping up TypeScript. Not sure how to fix, but it doesn't seem like that's
  // worth the time investment.
  generateJWK: jest.fn(
    async (_kty, _crvBitLength, _parameters, _isPrivate) =>
      JoseUtilityMockGenerateJWKResponse
  ) as any,
  privateJWKToPublicJWK: jest.fn(
    async _key => JoseUtilityMockPrivateJWKToPublicJWKResponse
  ),
  signJWT: jest.fn(
    async (_payload, _key, _options) => JoseUtilityMockSignJWTResponse
  )
};
