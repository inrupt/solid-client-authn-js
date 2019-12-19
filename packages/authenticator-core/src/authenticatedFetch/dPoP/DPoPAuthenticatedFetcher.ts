import IAuthenticatedFetcher from '../IAuthenticatedFetcher'
import IRequestInfo from '../IRequestInfo'
import IResponseInfo from '../IResponseInfo'

export default class DPoPAuthenticatedFetcher implements IAuthenticatedFetcher {
  async canHandle (requestInfo: IRequestInfo): Promise<boolean> {
    return false
  }

  async handle (requestInfo: IRequestInfo): Promise<IResponseInfo> {
    return {}
  }
}
