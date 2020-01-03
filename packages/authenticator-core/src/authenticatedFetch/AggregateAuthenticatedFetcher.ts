import AggregateHandler from '../util/handlerPattern/AggregateHandler'
import IAuthenticatedFetcher from './IAuthenticatedFetcher'
import IRequestInfo from './IRequestInfo'
import IResponseInfo from './IResponseInfo'
import { injectable, injectAll } from 'tsyringe'
import IRequestCredentials from './IRequestCredentials'

@injectable()
export default class AggregateAuthenticatedFetcher
  extends AggregateHandler<[IRequestCredentials, IRequestInfo], IResponseInfo>
  implements IAuthenticatedFetcher {

  constructor (
    @injectAll('authenticatedFetchers') authenticatedFetchers: IAuthenticatedFetcher[]
  ) {
    super(authenticatedFetchers)
  }
}
