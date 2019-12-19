import AggregateHandler from '../util/handlerPattern/AggregateHandler'
import { inject, injectable, injectAll } from 'tsyringe'
import ILoginHandler from './ILoginHandler'
import { URL } from 'url'

@injectable()
export default class AggregateLoginHandler
  extends AggregateHandler<[string | URL], void>
  implements ILoginHandler {

  constructor (
    @injectAll('loginHandlers') loginHandlers: ILoginHandler[]
  ) {
    super(loginHandlers)
  }
}
