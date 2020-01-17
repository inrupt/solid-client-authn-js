import { EventEmitter } from 'events'
import ISolidSession from './ISolidSession'
import { injectable, inject } from 'tsyringe'
import IStorage from './IStorage'
import IAuthenticatedFetcher from '../authenticatedFetch/IAuthenticatedFetcher'
import URL from 'url-parse'
import ILoginHandler from '../login/ILoginHandler'
import ILoginOptions from '../login/ILoginOptions'
import IDPoPRequestCredentials from '../util/dpop/IDPoPRequestCredentials'

@injectable()
export default class Authenticator extends EventEmitter {

  constructor (
    @inject('storage') private storage: IStorage,
    @inject('authenticatedFetcher') private authenticatedFetcher: IAuthenticatedFetcher,
    @inject('loginHandler') private loginHandler: ILoginHandler
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
      await this.storage.set('accessToken', options.accessToken)
    }
  }

  async fetch (requestInfo: RequestInfo, requestInit?: RequestInit): Promise<Response> {
    // TODO: fetching access token should be done elsewhere
    const credentials: IDPoPRequestCredentials = {
      type: 'dpop',
      authToken: await this.storage.get('accessToken'),
      clientKey: await this.storage.get('clientKey')
    }
    return this.authenticatedFetcher
      .handle(credentials, new URL(requestInfo.toString()), requestInit)
  }

  async login (loginOptions: ILoginOptions): Promise<void> {
    await this.loginHandler.handle(loginOptions)
  }
}
