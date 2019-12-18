import { EventEmitter } from 'events'
import ISolidSession from './ISolidSession'
import { injectable, inject } from 'tsyringe'
import IStorage from './IStorage'
import IRequestInfo from '../authenticatedFetch/IRequestInfo'
import IResponseInfo from '../authenticatedFetch/IResponseInfo'
import IAuthenticatedFetcher from '../authenticatedFetch/IAuthenticatedFetcher'
import { URL } from 'url'
import ILoginHandler from '../login/ILoginHandler'

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

  async fetch (requestInfo: IRequestInfo): Promise<IResponseInfo> {
    const authToken = this.storage.get('authToken')
    return this.authenticatedFetcher.handle(authToken)
  }

  async login (identityProvider: string | URL, options: Object): Promise<void> {
    await this.loginHandler.handle(identityProvider)
  }
}
