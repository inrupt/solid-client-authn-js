/**
 * Creates a DPoP JWT to be embedded in the header
 */
import URL from 'url-parse'
import { inject, injectable } from 'tsyringe'
import IJoseUtility from '../../authenticator/IJoseUtility'
import { IDPoPClientKeyManager } from './DPoPClientKeyManager'
import { IUUIDGenerator } from '../UUIDGenerator'

export interface IDPoPHeaderCreator {
  /**
   * Creates the DPoP Header token
   * @param audience The URL of the RS
   * @param method The HTTP method that is being used
   */
  createHeaderToken (
    audience: URL,
    method: string
  ): Promise<string>
}

@injectable()
export default class DPoPHeaderCreator implements IDPoPHeaderCreator {
  constructor (
    @inject('joseUtility') private joseUtility: IJoseUtility,
    @inject('dPoPClientKeyManager') private dPoPClientKeyManager: IDPoPClientKeyManager,
    @inject('uuidGenerator') private uuidGenerator: IUUIDGenerator
  ) {}

  async createHeaderToken (
    audience: URL,
    method: string
  ): Promise<string> {
    // TODO: update for multiple signing abilities
    const clientKey = await this.dPoPClientKeyManager.getClientKey()
    return this.joseUtility.signJWT(
      {
        htu: audience.toString(),
        htm: method,
        jti: this.uuidGenerator.v4()
      },
      clientKey,
      {
        header: {
          jwk: await this.joseUtility.privateJWKToPublicJWK(clientKey),
          typ: 'dpop+jwt'
        },
        expiresIn: '1 hour',
        algorithm: 'RS256'
      }
    )
  }
}
