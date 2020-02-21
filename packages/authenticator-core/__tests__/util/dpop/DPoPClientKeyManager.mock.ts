import { IDpopClientKeyManager } from "../../../src/util/dpop/DpopClientKeyManager";
import URL from "url-parse";
import { JSONWebKey } from "jose";
import IOidcOptions from "../../../src/login/oidc/IOidcOptions";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default function DpopClientKeyManagerMocks() {
  const DpopClientKeyManagerMockGenerateClientKeyIfNotAlreadyFunction = jest.fn(
    async (oidcOptions: IOidcOptions) => {
      /* void */
    }
  );

  const DpopClientKeyManagerMockGetClientKeyResponse: JSONWebKey = {
    kty: "RSA",
    e: "abcd",
    n: "1234"
  };

  const DpopClientKeyManagerMockGetClientKeyFunction = jest.fn(async () => {
    return DpopClientKeyManagerMockGetClientKeyResponse;
  });

  const DpopClientKeyManagerMock: () => IDpopClientKeyManager = jest.fn<
    IDpopClientKeyManager,
    unknown[]
  >(() => ({
    generateClientKeyIfNotAlready: DpopClientKeyManagerMockGenerateClientKeyIfNotAlreadyFunction,
    getClientKey: DpopClientKeyManagerMockGetClientKeyFunction
  }));

  return {
    DpopClientKeyManagerMockGenerateClientKeyIfNotAlreadyFunction,
    DpopClientKeyManagerMockGetClientKeyResponse,
    DpopClientKeyManagerMockGetClientKeyFunction,
    DpopClientKeyManagerMock
  };
}
