import IAuthenticatedFetcher from '../IAuthenticatedFetcher'
import URL from 'url-parse'
import IRequestCredentials from '../IRequestCredentials'
import NotImplementedError from '../../util/errors/NotImplementedError'

export default class BearerAuthenticatedFetcher implements IAuthenticatedFetcher {
  async canHandle (
    requestCredentials: IRequestCredentials,
    url: URL,
    requestInit?: RequestInit
  ): Promise<boolean> {
    return requestCredentials.type === 'bearer'
  }

  async handle (
    requestCredentials: IRequestCredentials,
    url: URL,
    requestInit?: RequestInit
  ): Promise<Response> {
    throw new NotImplementedError('BearerAuthenticatedFetcher')
  }
}
