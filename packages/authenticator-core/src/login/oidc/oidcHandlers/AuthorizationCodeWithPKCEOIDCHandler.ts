/**
 * Handler for the Authorization Code with PKCE Flow
 */
import IOIDCHandler from '../IOIDCHandler'
import IOIDCOptions from '../IOIDCOptions'
import NotImplementedError from '../../../util/errors/NotImplementedError'

export default class AuthorizationCodeWithPKCEOIDCHandler implements IOIDCHandler {
  async canHandle (oidcLoginOptions: IOIDCOptions): Promise<boolean> {
    return false
  }

  async handle (oidcLoginOptions: IOIDCOptions): Promise<void> {
    throw new NotImplementedError('AuthorizationCodeWithPKCEOIDCHandler handle')
  }
}
