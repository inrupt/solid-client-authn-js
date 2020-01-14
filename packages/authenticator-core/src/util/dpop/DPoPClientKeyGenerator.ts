import IOIDCOptions from '../../login/oidc/IOIDCOptions'
import NotImplementedError from '../../util/errors/NotImplementedError'

export interface IDPoPClientKeyGenerator {
  generateClientKeyIfNotAlready (oidcOptions: IOIDCOptions): Promise<void>
}

export default class DPoPClientKeyGenerator implements IDPoPClientKeyGenerator {
  async generateClientKeyIfNotAlready (oidcOptions: IOIDCOptions): Promise<void> {
    throw new NotImplementedError('generateClientKeyIfNotAlready')
  }
}
