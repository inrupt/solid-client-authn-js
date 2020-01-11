import 'reflect-metadata'
import { container } from 'tsyringe'
import Authenticator from './authenticator/Authenticator'
import IAuthenticatedFetcher from './authenticatedFetch/IAuthenticatedFetcher'
import AggregateAuthenticatedFetcher from './authenticatedFetch/AggregateAuthenticatedFetcher'
import DPoPAuthenticatedFetcher from './authenticatedFetch/dPoP/DPoPAuthenticatedFetcher'
import ILoginHandler from './login/ILoginHandler'
import AggregateLoginHandler from './login/AggregateLoginHandler'
import IStorage from './authenticator/IStorage'
import OIDCLoginHandler from './login/oidc/OIDCLoginHandler'
import IOIDCHandler from './login/oidc/IOIDCHandler'
import AggregateOIDCHandler from './login/oidc/AggregateOIDCHandler'
import AuthorizationCodeOIDCHandler from './login/oidc/authCode/AuthorizationCodeOIDCHandler'
import AuthorizationCodeWithPKCEOIDCHandler from './login/oidc/authCode/AuthorizationCodeWithPKCEOIDCHandler'
import ClientCredentialsOIDCHandler from './login/oidc/clientCredentials/ClientCredentialsOIDCHandler'
import PrimaryDeviceOIDCHandler from './login/oidc/device/PrimaryDeviceOIDCHandler'
import SecondaryDeviceOIDCHandler from './login/oidc/device/SecondaryDeviceOIDCHandler'
import LegacyImplicitFlowOIDCHandler from './login/oidc/implicit/LegacyImplicitFlowOIDCHandler'
import RefreshTokenOIDCHandler from './login/oidc/refreshToken/RefreshTokenOIDCHandler'
import Fetcher, { IFetcher } from './util/Fetcher'
import IssuerConfigFetcher, { IIssuerConfigFetcher } from './login/oidc/IssuerConfigFetcher'

// Util
container.register<IFetcher>('fetcher', {
  useClass: Fetcher
})

// Authenticated Fetcher
container.register<IAuthenticatedFetcher>('authenticatedFetcher', {
  useClass: AggregateAuthenticatedFetcher
})
container.register<IAuthenticatedFetcher>('authenticatedFetchers', {
  useClass: DPoPAuthenticatedFetcher
})

// Login
container.register<ILoginHandler>('loginHandler', {
  useClass: AggregateLoginHandler
})
container.register<ILoginHandler>('loginHandlers', {
  useClass: OIDCLoginHandler
})

// Login/OIDC
container.register<IOIDCHandler>('oidcHandler', {
  useClass: AggregateOIDCHandler
})
container.register<IOIDCHandler>('oidcHandlers', {
  useClass: RefreshTokenOIDCHandler
})
container.register<IOIDCHandler>('oidcHandlers', {
  useClass: AuthorizationCodeOIDCHandler
})
container.register<IOIDCHandler>('oidcHandlers', {
  useClass: AuthorizationCodeWithPKCEOIDCHandler
})
container.register<IOIDCHandler>('oidcHandlers', {
  useClass: ClientCredentialsOIDCHandler
})
container.register<IOIDCHandler>('oidcHandlers', {
  useClass: PrimaryDeviceOIDCHandler
})
container.register<IOIDCHandler>('oidcHandlers', {
  useClass: SecondaryDeviceOIDCHandler
})
container.register<IOIDCHandler>('oidcHandlers', {
  useClass: LegacyImplicitFlowOIDCHandler
})

// Login/OIDC/Issuer
container.register<IIssuerConfigFetcher>('issuerConfigFetcher', {
  useClass: IssuerConfigFetcher
})

export default function authenticator (dependencies: {
  storage: IStorage
}): Authenticator {
  const authenticatorContainer = container.createChildContainer()
  authenticatorContainer.register<IStorage>('storage', { useValue: dependencies.storage })
  return authenticatorContainer.resolve(Authenticator)
}

export function authenticatedFetch () {
  // TODO: implement
}

export function login () {
  // TODO: Implement
}
