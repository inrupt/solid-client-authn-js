import { Selector } from 'testcafe'

fixture('Index').page('http://localhost:9000/')

test('The hero section is visible.', async (t) => {
  const title = Selector('h1')

  await t.expect(title.exists).ok()
})
