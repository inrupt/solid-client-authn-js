import IOIDCLoginHandler from './IOIDCLoginHandler'
import IOIDCLoginOptions from './IOIDCLoginOptions'
import NotImplementedError from '../../util/NotImplementedError'

export default class LegacyImplicitFlowLoginHandler implements IOIDCLoginHandler {
  async canHandle (oidcLoginOptions: IOIDCLoginOptions): Promise<boolean> {
    throw new NotImplementedError('canHandle')
  }

  async handle (oidcLoginOptions: IOIDCLoginOptions): Promise<void> {
    throw new NotImplementedError('handle')
  }
}
