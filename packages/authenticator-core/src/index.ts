import 'reflect-metadata'
import { container } from 'tsyringe'
import Authenticator from './authenticator/Authenticator'

export default function authenticator (): Authenticator {
  const authenticatorContainer = container.createChildContainer()
  return authenticatorContainer.resolve(Authenticator)
}

export function authenticatedFetch () {
  // TODO: implement
}

export function login () {
  // TODO: Implement
}
