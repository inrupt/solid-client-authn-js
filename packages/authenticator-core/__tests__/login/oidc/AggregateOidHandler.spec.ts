jest.mock('../../../src/util/handlerPattern/AggregateHandler')

// Required by TSyringe:
import 'reflect-metadata'
import AggregateOIDCHandler from '../../../src/login/oidc/AggregateOIDCHandler'
import IOIDCHandler from '../../../src/login/oidc/IOIDCHandler'
import AggregateHandler from '../../../src/util/handlerPattern/AggregateHandler'

describe('AggregateOIDCHandler', () => {
  it('should pass injected handlers to its superclass', () => {
    new AggregateOIDCHandler(['Some handler'] as any as IOIDCHandler[])

    expect((AggregateHandler as jest.Mock).mock.calls).toEqual([
      [ ['Some handler'] ],
    ])
  })
})
