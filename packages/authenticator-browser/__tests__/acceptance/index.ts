/**
 * Acceptance test for the browser. Uses TestCafe to open up browser windows and go through auth
 * and fetch flows
 */

import { Selector } from 'testcafe'

fixture('Index').page('http://localhost:9000/')

test('The hero section is visible.', async (t) => {
  await t.click('#loginButton')
    .expect(Selector('#loginPageHeader').innerText).eql('Log In')
  await t.click('#loginSubmit')
  await t.click('#fetchButton')
    .expect(Selector('#fetchResult').value).eql('Success')

})
