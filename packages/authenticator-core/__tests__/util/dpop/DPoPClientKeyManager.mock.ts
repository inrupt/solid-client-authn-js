import { IDPoPClientKeyManager } from '../../../src/util/dpop/DPoPClientKeyManager'
import URL from 'url-parse'
import { JSONWebKey } from 'jose'
import IOIDCOptions from '../../../src/login/oidc/IOIDCOptions'

export default function DPoPClientKeyManagerMocks () {
  const DPoPClientKeyManagerMockGenerateClientKeyIfNotAlreadyFunction = jest.fn(
    async (oidcOptions: IOIDCOptions) => { /* void */ }
  )

  const DPoPClientKeyManagerMockGetClientKeyResponse: JSONWebKey = {
    kty: 'RSA',
    e: 'abcd',
    n: '1234'
  }

  const DPoPClientKeyManagerMockGetClientKeyFunction = jest.fn(
    async () => {
      return DPoPClientKeyManagerMockGetClientKeyResponse
    }
  )

  const DPoPClientKeyManagerMock: () => IDPoPClientKeyManager =
    jest.fn<IDPoPClientKeyManager, any[]>(() => ({
      generateClientKeyIfNotAlready: DPoPClientKeyManagerMockGenerateClientKeyIfNotAlreadyFunction,
      getClientKey: DPoPClientKeyManagerMockGetClientKeyFunction
    }))

  return {
    DPoPClientKeyManagerMockGenerateClientKeyIfNotAlreadyFunction,
    DPoPClientKeyManagerMockGetClientKeyResponse,
    DPoPClientKeyManagerMockGetClientKeyFunction,
    DPoPClientKeyManagerMock
  }
}
