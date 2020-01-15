import Authenticator from './index'
import URL from 'url-parse'

const authenticator = Authenticator()

const checkIfRedirect = async () => {
  const curUrl = new URL(window.location.href, true)
  if (curUrl.query['access_token']) {
    await authenticator.applyTokens({
      accessToken: curUrl.query['access_token']
    })
  }
}
checkIfRedirect()
  .then(() => { /* do nothing */ })
  .catch((err) => { throw err })

module.exports = authenticator
