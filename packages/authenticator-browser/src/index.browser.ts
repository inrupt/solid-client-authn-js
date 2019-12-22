import Authenticator from './index'

const auth = Authenticator()

async function handle () {
  await auth.fetch({})
}
handle()
  .then(() => console.log('complete'))
  .catch(() => console.log('uh oh'))
