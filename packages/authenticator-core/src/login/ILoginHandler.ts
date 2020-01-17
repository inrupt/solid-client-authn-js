/**
 * A Login Handler will log a user in if it is able to use the provided Login Parameters
 */
import IHandleable from '../util/handlerPattern/IHandleable'
import { URL } from 'url'
import ILoginOptions from './ILoginOptions'

type ILoginHandler = IHandleable<[ILoginOptions], void>
export default ILoginHandler
