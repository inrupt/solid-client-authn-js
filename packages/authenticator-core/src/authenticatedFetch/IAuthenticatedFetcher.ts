import IResponseInfo from './IResponseInfo'
import IRequestInfo from './IRequestInfo'
import IHandleable from '../util/handlerPattern/IHandleable'

type IAuthenticatedFetcher = IHandleable<[IRequestInfo], IResponseInfo>
export default IAuthenticatedFetcher
