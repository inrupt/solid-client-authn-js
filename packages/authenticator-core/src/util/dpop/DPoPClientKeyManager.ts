import IOIDCOptions from '../../login/oidc/IOIDCOptions'
import URL from 'url-parse'
import { inject, injectable } from 'tsyringe'
import { JSONWebKey } from 'jose'
import { IStorageRetriever } from '../StorageRetriever'
import jwkSchema from './JWKSchema'
import IJoseUtility from '../../authenticator/IJoseUtility'
import IStorage from '../../authenticator/IStorage'

export interface IDPoPClientKeyManager {
  generateClientKeyIfNotAlready (oidcOptions: IOIDCOptions): Promise<void>
  getClientKey (): Promise<JSONWebKey | null>
}

@injectable()
export default class DPoPClientKeyManager implements IDPoPClientKeyManager {
  constructor (
    @inject('storageRetriever') private storageRetriever: IStorageRetriever,
    @inject('joseUtility') private joseUtility: IJoseUtility,
    @inject('storage') private storage: IStorage
  ) {}

  getLocalStorageKey () {
    return `clientKey`
  }

  async generateClientKeyIfNotAlready (oidcOptions: IOIDCOptions): Promise<void> {
    let jwk: JSONWebKey = (await this.storageRetriever.retrieve(
      this.getLocalStorageKey(),
      jwkSchema
    )) as JSONWebKey

    if (!jwk) {
      // TODO: differentiate between what a server supports instead of hard coding rsa?
      jwk = await this.joseUtility.generateJWK('RSA', 2048, {
        alg: 'RSA',
        use: 'sig'
      })
      await this.storage.set(this.getLocalStorageKey(), JSON.stringify(jwk))
    }
  }

  async getClientKey (): Promise<JSONWebKey | null> {
    return (await this.storageRetriever.retrieve(
      this.getLocalStorageKey(),
      jwkSchema
    )) as JSONWebKey
  }
}
