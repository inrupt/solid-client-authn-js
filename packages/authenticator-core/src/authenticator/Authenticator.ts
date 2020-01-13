import { EventEmitter } from 'events'
import ISolidSession from './ISolidSession'
import { injectable, inject } from 'tsyringe'
import IStorage from './IStorage'
import IAuthenticatedFetcher from '../authenticatedFetch/IAuthenticatedFetcher'
import URL from 'url-parse'
import ILoginHandler from '../login/ILoginHandler'
import ILoginOptions from '../login/ILoginOptions'
import NotImplementedError from '../util/errors/NotImplementedError'
import IDPoPRequestCredentials from '../authenticatedFetch/dPoP/IDPoPRequestCredentials'

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

  async tempGenDPoPCredentials (): Promise<IDPoPRequestCredentials> {
    return {
      type: 'dpop',
      clientKey: {},
      authToken: {}
    }
  }

  async fetch (requestInfo: RequestInfo, requestInit?: RequestInit): Promise<Response> {
    // TODO: Get the auth token in a good way
    return this.authenticatedFetcher
      .handle(await this.tempGenDPoPCredentials(), new URL(requestInfo.toString()), requestInit)
  }

  async login (loginOptions: ILoginOptions): Promise<void> {
    await this.loginHandler.handle(loginOptions)
  }
}
