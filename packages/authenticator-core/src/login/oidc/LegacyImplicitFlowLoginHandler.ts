import ILoginHandler from '../ILoginHandler'
import { URL } from 'url'

export default class LegacyImplicitFlowLoginHandler implements ILoginHandler {
  async canHandle (webId: string | URL): Promise<boolean> {
    return false
  }

  async handle (webId: string | URL): Promise<void> {
    // TODO: implement
  }
}
