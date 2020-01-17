/**
 * Top level file for the authenticator-browser
 */
import AuthenticatorCore from '@solid/authenticator-core'
import InMemoryStorage from './storage/InMemoryStorage'
import BrowserJoseUtility from './BrowserJoseUtility'
import Authenticator from '@solid/authenticator-core/dist/authenticator/Authenticator'

export default function authenticator (): Authenticator {
  // TODO implement
  return AuthenticatorCore({
    storage: new InMemoryStorage(),
    joseUtility: new BrowserJoseUtility()
  })
}

export function authenticatedFetch () {
  // TODO implement
}

export function login (): string {
  // TODO implement
  return ''
}
