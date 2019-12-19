import 'reflect-metadata'
import { container } from 'tsyringe'
import Authenticator from './authenticator/Authenticator'
import IAuthenticatedFetcher from './authenticatedFetch/IAuthenticatedFetcher'
import AggregateAuthenticatedFetcher from './authenticatedFetch/AggregateAuthenticatedFetcher'
import DPoPAuthenticatedFetcher from './authenticatedFetch/dPoP/DPoPAuthenticatedFetcher'
import ILoginHandler from './login/ILoginHandler'
import AggregateLoginHandler from './login/AggregateLoginHandler'
import LegacyImplicitFlowLoginHandler from './login/oidc/LegacyImplicitFlowLoginHandler'
import IStorage from './authenticator/IStorage'

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
  useClass: LegacyImplicitFlowLoginHandler
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
