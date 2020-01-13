import IHandleable from '../util/handlerPattern/IHandleable'
import IRequestCredentials from './IRequestCredentials'
import URL from 'url-parse'

type IAuthenticatedFetcher = IHandleable<[IRequestCredentials, URL, RequestInit?], Response>
export default IAuthenticatedFetcher
