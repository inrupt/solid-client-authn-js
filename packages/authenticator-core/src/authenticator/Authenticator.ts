import { EventEmitter } from 'events'
import ISolidSession from './ISolidSession'
import { injectable, inject } from 'tsyringe'
import IStorage from './IStorage'
import IAuthenticatedFetcher from '../authenticatedFetch/IAuthenticatedFetcher'
import URL from 'url-parse'
import ILoginHandler from '../login/ILoginHandler'
import ILoginOptions from '../login/ILoginOptions'
import IDPoPRequestCredentials from '../util/dpop/IDPoPRequestCredentials'
import { IFetcher } from '../util/Fetcher'
import NotImplementedError from '../util/errors/NotImplementedError'

@injectable()
export default class Authenticator extends EventEmitter {

  constructor (
    @inject('storage') private storage: IStorage,
    @inject('authenticatedFetcher') private authenticatedFetcher: IAuthenticatedFetcher,
    @inject('loginHandler') private loginHandler: ILoginHandler,
    // TODO: remove this after temporary use
    @inject('fetcher') private fetcher: IFetcher
  ) {
    super()
  }

  trackSession (callback: (session?: ISolidSession) => any): void {
    this.on('session', callback)
  }

  async applyTokens (options: { accessToken?: string, idToken?: string }): Promise<void> {
    // TODO Handle ID_Token
    if (options.accessToken) {
      // TODO: Validate Access token
      await this.storage.set('access_token', options.accessToken)
    }
  }

  async fetch (requestInfo: RequestInfo, requestInit?: RequestInit): Promise<Response> {
    // TODO: Get the auth token in a good way
    // return this.authenticatedFetcher
    //   .handle(await this.tempGenDPoPCredentials(), new URL(requestInfo.toString()), requestInit)
    throw new NotImplementedError('authenticator.fetch')
  }

  async login (loginOptions: ILoginOptions): Promise<void> {
    await this.loginHandler.handle(loginOptions)
  }
}
