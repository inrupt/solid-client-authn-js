import URL from 'url-parse'
import { inject, injectable } from 'tsyringe'
import IJoseUtility from '../../authenticator/IJoseUtility'
import NotImplementedError from '../errors/NotImplementedError'

export interface IDPoPHeaderCreator {
  createHeaderToken (
    audience: URL,
    method: string
  ): Promise<string>
}

@injectable()
export default class DPoPHeaderCreator implements IDPoPHeaderCreator {
  constructor (
    @inject('joseUtility') private joseUtility: IJoseUtility
  ) {}

  async createHeaderToken (
    audience: URL,
    method: string
  ): Promise<string> {
    throw new NotImplementedError('CreateHeaderToken')
  }
}
