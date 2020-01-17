/**
 * Responsible for fetching an IDP configuration
 */
import IIssuerConfig from './IIssuerConfig'
import URL from 'url-parse'
import { injectable, inject } from 'tsyringe'
import { IFetcher } from '../../util/Fetcher'
import issuerConfigSchema from './issuerConfigSchema'
import ConfigurationError from '../../util/errors/ConfigurationError'
import { IStorageRetriever } from '../../util/StorageRetriever'
import IStorage from '../../authenticator/IStorage'

export interface IIssuerConfigFetcher {
  /**
   * Fetches the configuration
   * @param issuer URL of the IDP
   */
  fetchConfig (issuer: URL): Promise<IIssuerConfig>
}

@injectable()
export default class IssuerConfigFetcher implements IIssuerConfigFetcher {

  constructor (
    @inject('fetcher') private fetcher: IFetcher,
    @inject('storageRetriever') private storageRetriever: IStorageRetriever,
    @inject('storage') private storage: IStorage
  ) {}

  getLocalStorageKey (issuer: URL) {
    return `issuerConfig:${issuer.toString()}`
  }

  processConfig (config: { [key: string]: any }): IIssuerConfig {
    return {
      ...config,
      issuer: new URL(config.issuer),
      authorization_endpoint: new URL(config.authorization_endpoint),
      token_endpoint: new URL(config.token_endpoint),
      userinfo_endpoint: new URL(config.userinfo_endpoint),
      jwks_uri: new URL(config.jwks_uri),
      registration_endpoint: new URL(config.registration_endpoint)
    } as IIssuerConfig
  }

  async fetchConfig (issuer: URL): Promise<IIssuerConfig> {
    let issuerConfig: IIssuerConfig = (await this.storageRetriever.retrieve(
      this.getLocalStorageKey(issuer),
      issuerConfigSchema,
      this.processConfig
    )) as IIssuerConfig

    // If it is not stored locally, fetch it
    if (!issuerConfig) {
      const wellKnownUrl = new URL(issuer.toString())
      wellKnownUrl.set('pathname', '/.well-known/openid-configuration')
      const issuerConfigRequestBody = await this.fetcher.fetch(wellKnownUrl)
      // Check the validity of the fetched config
      try {
        issuerConfig = this.processConfig(await issuerConfigRequestBody.json())
      } catch (err) {
        throw new ConfigurationError(`${issuer.toString()} has an invalid configuration: ${err.message}`)
      }
    }

    // Update store with fetched config
    await this.storage.set(this.getLocalStorageKey(issuer), JSON.stringify(issuerConfig))

    return issuerConfig
  }
}
