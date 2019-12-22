import AuthenticatorCore from '@solid/authenticator-core'
import InMemoryStorage from './storage/InMemoryStorage'

export default function authenticator () {
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
