import AggregateHandler from '../util/handlerPattern/AggregateHandler'
import { inject, injectable, injectAll } from 'tsyringe'
import IOIDCLoginHandler from './IOIDCLoginHandler'
import IOIDCLoginOptions from './IOIDCLoginOptions'

@injectable()
export default class AggregateOIDCLoginHandler
  extends AggregateHandler<[IOIDCLoginOptions], void>
  implements IOIDCLoginHandler {

  constructor (
    @injectAll('oidcLoginHandlers') oidcLoginHandlers: IOIDCLoginHandler[]
  ) {
    super(oidcLoginHandlers)
  }
}
