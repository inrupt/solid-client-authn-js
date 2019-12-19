import AggregateHandler from '../util/handlerPattern/AggregateHandler'
import IAuthenticatedFetcher from './IAuthenticatedFetcher'
import IRequestInfo from './IRequestInfo'
import IResponseInfo from './IResponseInfo'
import { inject, injectable, injectAll } from 'tsyringe'

@injectable()
export default class AggregateAuthenticatedFetcher
  extends AggregateHandler<[IRequestInfo], IResponseInfo>
  implements IAuthenticatedFetcher {

  constructor (
    @injectAll('authenticatedFetchers') authenticatedFetchers: IAuthenticatedFetcher[]
  ) {
    super(authenticatedFetchers)
  }
}
