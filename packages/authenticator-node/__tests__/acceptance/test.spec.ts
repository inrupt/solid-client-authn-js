import Authenticator from '../../src/index'

describe('Acceptance Test', () => {
  it('Should authenticate', async () => {
    const authenticator = Authenticator()
    const result = await authenticator.fetch('https://jackson.solid.community/cool/stuff', {})
    console.log(await result.text())
  })
})
