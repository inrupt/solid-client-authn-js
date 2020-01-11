import { injectable, inject } from 'tsyringe'
import ILoginHandler from '../ILoginHandler'
import ILoginOptions from '../ILoginOptions'
import IOIDCHandler from './IOIDCHandler'
import IOIDCOptions from './IOIDCOptions'
import ConfigurationError from '../../util/errors/ConfigurationError'
import { IIssuerConfigFetcher } from './IssuerConfigFetcher'
import IIssuerConfig from './IIssuerConfig'

@injectable()
export default class OIDCLoginHandler implements ILoginHandler {
  constructor (
    @inject('oidcHandler') private oidcHandler: IOIDCHandler,
    @inject('issuerConfigFetcher') private issuerConfigFetcher: IIssuerConfigFetcher
  ) {}

  checkOptions (options: ILoginOptions): Error | null {
    if (!options.oidcIssuer) {
      return new ConfigurationError('OIDCLoginHandler requires an oidcIssuer')
    }
    return null
  }

  async canHandle (options: ILoginOptions): Promise<boolean> {
    return !this.checkOptions(options)
  }

  async handle (options: ILoginOptions): Promise<void> {
    // Check to ensure the login options are correct
    const optionsError: Error = this.checkOptions(options)
    if (optionsError) {
      throw optionsError
    }

    // Fetch OpenId Config
    const issuerConfig: IIssuerConfig =
      await this.issuerConfigFetcher.fetchConfig(options.oidcIssuer)

    // Construct OIDC Options
    const OIDCOptions: IOIDCOptions = {
      issuer: options.oidcIssuer,
      issuerConfiguration: issuerConfig
    }

    // Call proper OIDC Handler
    await this.oidcHandler.handle(OIDCOptions)
  }
}
