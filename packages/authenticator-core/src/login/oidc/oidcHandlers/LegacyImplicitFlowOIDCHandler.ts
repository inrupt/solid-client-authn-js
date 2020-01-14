import IOIDCHandler from '../IOIDCHandler'
import IOIDCOptions from '../IOIDCOptions'
import URL from 'url-parse'
import { inject, injectable } from 'tsyringe'
import { IFetcher } from '../../../util/Fetcher'
import { IDPoPHeaderCreator } from '../../../util/dpop/DPoPHeaderCreator'

@injectable()
export default class LegacyImplicitFlowOIDCHandler implements IOIDCHandler {
  constructor (
    @inject('fetcher') private fetcher: IFetcher,
    @inject('dPoPHeaderCreator') private dPoPHeaderCreator: IDPoPHeaderCreator
  ) {}

  async canHandle (oidcLoginOptions: IOIDCOptions): Promise<boolean> {
    return oidcLoginOptions.issuerConfiguration.grant_types_supported &&
      oidcLoginOptions.issuerConfiguration.grant_types_supported.indexOf('implicit') > -1
  }

  async handle (oidcLoginOptions: IOIDCOptions): Promise<void> {
    const requestUrl =
      new URL(oidcLoginOptions.issuerConfiguration.authorization_endpoint.toString())
    // TODO: include client_id, state, and nonce
    requestUrl.set('query', {
      response_type: 'id_token token',
      redirect_url: oidcLoginOptions.redirectUrl.toString(),
      scope: 'openid id_vc'
    })
    await this.fetcher.fetch(requestUrl, {
      headers: {
        DPoP: oidcLoginOptions.dpop ?
          await this.dPoPHeaderCreator.createHeaderToken(oidcLoginOptions.issuer, 'GET') : undefined
      }
    })
  }
}
