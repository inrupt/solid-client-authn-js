import { IDPoPHeaderCreator } from '../../../src/util/dpop/DPoPHeaderCreator'
import URL from 'url-parse'

export default function DPoPHeaderCreatorMocks () {
  // DPoPHeaderCreator
  const DPoPHeaderCreatorResponse = 'someToken'

  const DPoPHeaderCreatorMockFunction = jest.fn(async (audience: URL, method: string) => {
    return DPoPHeaderCreatorResponse
  })

  const DPoPHeaderCreatorMock = jest.fn<IDPoPHeaderCreator, any[]>(() => ({
    createHeaderToken: DPoPHeaderCreatorMockFunction
  }))

  return {
    DPoPHeaderCreatorResponse,
    DPoPHeaderCreatorMockFunction,
    DPoPHeaderCreatorMock
  }
}
