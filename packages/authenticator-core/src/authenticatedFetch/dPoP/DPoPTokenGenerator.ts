import IDPoPRequestCredentials from './IDPoPRequestCredentials'
import URL from 'url-parse'

export interface IDPoPTokenGenerator {
  generateToken (credentials: IDPoPRequestCredentials, audience: URL): Promise<string>
}

export default class DPoPTokenGenerator implements IDPoPTokenGenerator {
  async generateToken (): Promise<string> {
    return 'What a cool token!'
  }
}
