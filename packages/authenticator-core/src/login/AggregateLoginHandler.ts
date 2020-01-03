import AggregateHandler from '../util/handlerPattern/AggregateHandler'
import { inject, injectable, injectAll } from 'tsyringe'
import ILoginHandler from './ILoginHandler'
import ILoginOptions from './ILoginOptions'

@injectable()
export default class AggregateLoginHandler
  extends AggregateHandler<[ILoginOptions], void>
  implements ILoginHandler {

  constructor (
    @injectAll('loginHandlers') loginHandlers: ILoginHandler[]
  ) {
    super(loginHandlers)
  }
}
