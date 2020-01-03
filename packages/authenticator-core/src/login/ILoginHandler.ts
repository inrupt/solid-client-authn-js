import IHandleable from '../util/handlerPattern/IHandleable'
import { URL } from 'url'
import ILoginOptions from './ILoginOptions'

type ILoginHandler = IHandleable<[ILoginOptions], void>
export default ILoginHandler
