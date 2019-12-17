import { EventEmitter } from 'events'
import ISolidSession from './ISolidSession'
import { injectable, inject } from 'tsyringe'
import IStorage from './IStorage'
import IRequestInfo from '../authenticatedFetch/IRequestInfo'
import IResponseInfo from '../authenticatedFetch/IResponseInfo'
import IAuthenticatedFetcher from '../authenticatedFetch/IAuthenticatedFetcher'

@injectable()
export default class Authenticator extends EventEmitter {

  constructor (
    @inject('storage') private storage: IStorage,
    @inject('authenticatedFetcher') private authenticatedFetcher: IAuthenticatedFetcher
  ) {
    super()
  }

  trackSession (callback: (session?: SolidSession) => any): void {
    this.on('session', callback)
  }

  fetch (requestInfo: IRequestInfo): IResponseInfo {
    const authToken = this.storage.get('authToken')
    this.authenticatedFetcher.fetch(authToken)
  }

  getDPoPTokens
}
