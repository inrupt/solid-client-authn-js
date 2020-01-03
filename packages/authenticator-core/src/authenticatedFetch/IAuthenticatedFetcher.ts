import IResponseInfo from './IResponseInfo'
import IRequestInfo from './IRequestInfo'
import IHandleable from '../util/handlerPattern/IHandleable'
import IRequestCredentials from './IRequestCredentials'

type IAuthenticatedFetcher = IHandleable<[IRequestCredentials, IRequestInfo], IResponseInfo>
export default IAuthenticatedFetcher
