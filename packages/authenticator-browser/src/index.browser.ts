import Authenticator from './index'
import { URL } from 'url'

const auth = Authenticator()

async function handle () {
  await auth.login({
    issuer: new URL('https://stub.signin.nhs.uk')
  })
}
handle()
  .then(() => console.log('Fetch Complete'))
  .catch((err) => console.error(err))
