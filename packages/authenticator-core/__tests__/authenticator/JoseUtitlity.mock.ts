import IJoseUtility from "../../src/authenticator/IJoseUtility";
import { BasicParameters, ECCurve, OKPCurve, JSONWebKey, JWT } from "jose";

export default function JoseUtilityMocks() {
  const JoseUtilityMockGenerateJWKResponse: JSONWebKey = {
    kty: "RSA",
    e: "abcd",
    n: "1234"
  };

  const JoseUtilityMockGenerateJWKFunction = jest.fn(
    async (
      kty: "EC" | "OKP" | "RSA" | "oct",
      crvBitlength?: ECCurve | OKPCurve | number,
      parameters?: BasicParameters,
      isPrivate?: boolean
    ) => {
      return JoseUtilityMockGenerateJWKResponse;
    }
  );

  const JoseUtilityMockPrivateJWKToPublicJWKResponse: JSONWebKey = {
    kty: "RSA",
    e: "publicabcd",
    n: "public1234"
  };

  const JoseUtilityMockPrivateJWKToPublicJWKFunction = jest.fn(
    async (key: JSONWebKey) => {
      return JoseUtilityMockPrivateJWKToPublicJWKResponse;
    }
  );

  const JoseUtilityMockSignJWTResponse = "thisIsAKey";

  const JoseUtilityMockSignJWTFunction = jest.fn(
    async (
      payload: Record<string, any>,
      key: JSONWebKey,
      options?: JWT.SignOptions
    ) => {
      return JoseUtilityMockSignJWTResponse;
    }
  );

  const JoseUtilityMock: () => IJoseUtility = jest.fn<IJoseUtility, any[]>(
    () => ({
      generateJWK: JoseUtilityMockGenerateJWKFunction,
      privateJWKToPublicJWK: JoseUtilityMockPrivateJWKToPublicJWKFunction,
      signJWT: JoseUtilityMockSignJWTFunction
    })
  );

  return {
    JoseUtilityMock,
    JoseUtilityMockGenerateJWKFunction,
    JoseUtilityMockGenerateJWKResponse,
    JoseUtilityMockPrivateJWKToPublicJWKFunction,
    JoseUtilityMockPrivateJWKToPublicJWKResponse,
    JoseUtilityMockSignJWTFunction,
    JoseUtilityMockSignJWTResponse
  };
}
