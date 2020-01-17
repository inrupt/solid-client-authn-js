/**
 * The top level file that is run within the web browser.
 */

import Authenticator from './index'
import URL from 'url-parse'

const authenticator = Authenticator()

const checkIfRedirect = async () => {
  const curQuery = new URL(window.location.href, true).query
  if (curQuery['access_token']) {
    await authenticator.applyTokens({
      accessToken: curQuery['access_token']
    })
    delete curQuery['access_token']
    delete curQuery['id_token']
    const newUrl = new URL(window.location.href, true)
    newUrl.set('query', curQuery)
    window.location.href = newUrl.toString()
  }
}
checkIfRedirect()
  .then(() => { /* do nothing */ })
  .catch((err) => { throw err })

module.exports = authenticator
