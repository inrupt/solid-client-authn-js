import { URL } from 'url'

export default interface IOIDCLoginOptions {
  issuer: URL
  configuration: {
    // TODO: fill in with all the openid configurations
    // https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata
  }
}
