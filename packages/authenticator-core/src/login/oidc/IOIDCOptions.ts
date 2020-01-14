import URL from 'url-parse'
import IIssuerConfig from './IIssuerConfig'

export default interface IOIDCOptions {
  issuer: URL
  dpop: boolean
  redirectUrl: URL
  issuerConfiguration: IIssuerConfig
}
