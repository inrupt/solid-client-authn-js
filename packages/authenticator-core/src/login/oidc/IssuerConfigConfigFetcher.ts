import IIssuerConfig from './IIssuerConfig'
import { URL } from 'url'
import { injectable, inject } from 'tsyringe'
import { IFetcher } from '../../util/Fetcher'
import IStorage from '../../authenticator/IStorage'

export interface IIssuerConfigFetcher {
  fetchConfig (issuer: URL): Promise<IIssuerConfig>
}

@injectable()
export default class IssuerConfigFetcher implements IIssuerConfigFetcher {

  constructor (
    @inject('fetcher') private fetcher: IFetcher,
    @inject('storage') private storage: IStorage
  ) {}

  async fetchConfig (issuer: URL): Promise<IIssuerConfig> {
    // Check if config is stored locally

    // If it is stored locally, check the validity of the value

    // If it is not stored locally, fetch it

    // Check the validity of the fetched config

    // Update store with fetched config

    return {}
  }
}
