import URL from 'url-parse'
import { inject, injectable } from 'tsyringe'
import IJoseUtility from '../../authenticator/IJoseUtility'
import { IDPoPClientKeyManager } from './DPoPClientKeyManager'

export interface IDPoPHeaderCreator {
  createHeaderToken (
    audience: URL,
    method: string
  ): Promise<string>
}

@injectable()
export default class DPoPHeaderCreator implements IDPoPHeaderCreator {
  constructor (
    @inject('joseUtility') private joseUtility: IJoseUtility,
    @inject('dPoPClientKeyManager') private dPoPClientKeyManager: IDPoPClientKeyManager
  ) {}

  async createHeaderToken (
    audience: URL,
    method: string
  ): Promise<string> {
    const clientKey = await this.dPoPClientKeyManager.getClientKey()
    return this.joseUtility.signJWT(
      {
        htu: audience.toString(),
        htm: method
      },
      clientKey,
      {
        header: {
          jwk: await this.joseUtility.privateJWKToPublicJWK(clientKey),
          typ: 'dpop+jwt'
        }
      }
    )
  }
}
