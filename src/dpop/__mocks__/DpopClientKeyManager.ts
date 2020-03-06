import { IDpopClientKeyManager } from "../DpopClientKeyManager";
import { JSONWebKey } from "jose";

export const DpopClientKeyManagerMockGetClientKeyResponse: JSONWebKey = {
  kty: "RSA",
  e: "abcd",
  n: "1234"
};

export const DpopClientKeyManagerMock: jest.Mocked<IDpopClientKeyManager> = {
  generateClientKeyIfNotAlready: jest.fn(async _oidcOptions => undefined),
  getClientKey: jest.fn(
    async () => DpopClientKeyManagerMockGetClientKeyResponse
  )
};
