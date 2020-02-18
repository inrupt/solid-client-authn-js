jest.mock('../../src/util/handlerPattern/AggregateHandler')

// Required by TSyringe:
import 'reflect-metadata'
import AggregateLoginHandler from '../../src/login/AggregateLoginHandler'
import ILoginHandler from '../../src/login/ILoginHandler'
import AggregateHandler from '../../src/util/handlerPattern/AggregateHandler'

describe('AggregateLoginHandler', () => {
  it('should pass injected handlers to its superclass', () => {
    // tslint:disable-next-line
    new AggregateLoginHandler(['Some handler'] as any as ILoginHandler[])

    expect((AggregateHandler as jest.Mock).mock.calls).toEqual([
      [ ['Some handler'] ]
    ])
  })
})
