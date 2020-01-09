import { URL } from 'url'
import IIssuerConfig from './IIssuerConfig'

export default interface IOIDCOptions {
  issuer: URL
  issuerConfiguration: IIssuerConfig
}
