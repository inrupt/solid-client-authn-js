import IAuthenticatedFetcher from '../IAuthenticatedFetcher'
import IRequestCredentials from '../IRequestCredentials'
import ConfigurationError from '../../util/errors/ConfigurationError'
import IDPoPRequestCredentials from './IDPoPRequestCredentials'
import { injectable, inject } from 'tsyringe'
import { IDPoPTokenGenerator } from './DPoPTokenGenerator'
import URL from 'url-parse'
import { IFetcher } from '../../util/Fetcher'

@injectable()
export default class DPoPAuthenticatedFetcher implements IAuthenticatedFetcher {
  constructor (
    @inject('dPoPTokenGenerator') private dPoPTokenGenerator: IDPoPTokenGenerator,
    @inject('fetcher') private fetcher: IFetcher
  ) {}

  async canHandle (
    requestCredentials: IRequestCredentials,
    url: URL,
    requestInit?: RequestInit
  ): Promise<boolean> {
    // TODO include a schema check for the submitted data
    return requestCredentials.type === 'dpop'
  }

  async handle (
    requestCredentials: IRequestCredentials,
    url: URL,
    requestInit?: RequestInit
  ): Promise<Response> {
    if (!this.canHandle(requestCredentials, url, requestInit)) {
      throw new ConfigurationError(`DPoP Authenticated Fetcher Cannot handle ${requestCredentials}`)
    }
    const dPoPToken: string = await this.dPoPTokenGenerator
      .generateToken(requestCredentials as IDPoPRequestCredentials, new URL(url.origin))
    // TODO: this should clone requestInit before addint the authorization header
    return this.fetcher.fetch(url, {
      ...requestInit,
      headers: {
        ...requestInit.headers,
        Authorization: dPoPToken
      }
    })
  }
}
