import AuthenticatorCore from '@solid/authenticator-core'
import InMemoryStorage from './storage/InMemoryStorage'
import Authenticator from '@solid/authenticator-core/dist/authenticator/Authenticator'

export default function authenticator (): Authenticator {
  // TODO implement
  return AuthenticatorCore({
    storage: new InMemoryStorage()
  })
}

export function authenticatedFetch () {
  // TODO implement
}

export function login (): string {
  // TODO implement
  return ''
}
