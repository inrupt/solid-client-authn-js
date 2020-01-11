import IIssuerConfig from './IIssuerConfig'
import URL from 'url-parse'
import { injectable, inject } from 'tsyringe'
import { IFetcher } from '../../util/Fetcher'
import IStorage from '../../authenticator/IStorage'
import validateSchema from '../../util/validateSchema'
import issuerConfigSchema from './issuerConfigSchema'
import ConfigurationError from '../../util/errors/ConfigurationError'

export interface IIssuerConfigFetcher {
  fetchConfig (issuer: URL): Promise<IIssuerConfig>
}

@injectable()
export default class IssuerConfigFetcher implements IIssuerConfigFetcher {

  constructor (
    @inject('fetcher') private fetcher: IFetcher,
    @inject('storage') private storage: IStorage
  ) {}

  getLocalStorageKey (issuer: URL) {
    return `issuerConfig:${issuer.toString()}`
  }

  parseConfig (config: { [key: string]: any }): IIssuerConfig {
    validateSchema(issuerConfigSchema, config, true)
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
    let issuerConfig: IIssuerConfig
    // Check if config is stored locally
    const locallyStoredConfig: string | null =
      await this.storage.get(this.getLocalStorageKey(issuer))

    // If it is stored locally, check the validity of the value
    if (locallyStoredConfig) {
      try {
        issuerConfig = this.parseConfig(JSON.parse(locallyStoredConfig))
      } catch (err) {
        await this.storage.delete(this.getLocalStorageKey(issuer))
      }
    }

    // If it is not stored locally, fetch it
    if (!issuerConfig) {
      const wellKnownUrl = new URL(issuer.toString())
      wellKnownUrl.set('pathname', '/.well-known/openid-configuration')
      const issuerConfigRequestBody = await this.fetcher.fetch(wellKnownUrl)
      // Check the validity of the fetched config
      try {
        issuerConfig = this.parseConfig(await issuerConfigRequestBody.json())
      } catch (err) {
        throw new ConfigurationError(`${issuer.toString()} has an invalid configuration: ${err.message}`)
      }
    }

    // Update store with fetched config
    await this.storage.set(this.getLocalStorageKey(issuer), JSON.stringify(issuerConfig))

    console.log('ISSUER CONFIG')
    console.log(issuerConfig)

    return issuerConfig
  }
}
