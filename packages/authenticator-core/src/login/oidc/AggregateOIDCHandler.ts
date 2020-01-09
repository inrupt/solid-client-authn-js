import AggregateHandler from '../../util/handlerPattern/AggregateHandler'
import { injectable, injectAll } from 'tsyringe'
import IOIDCHandler from './IOIDCHandler'
import IOIDCOptions from './IOIDCOptions'

@injectable()
export default class AggregateOIDHandler
  extends AggregateHandler<[IOIDCOptions], void>
  implements IOIDCHandler {

  constructor (
    @injectAll('oidcHandlers') oidcLoginHandlers: IOIDCHandler[]
  ) {
    super(oidcLoginHandlers)
  }
}
