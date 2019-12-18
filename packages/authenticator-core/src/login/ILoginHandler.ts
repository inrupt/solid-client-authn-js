import IHandleable from '../util/handlerPattern/IHandleable'
import { URL } from 'url'

type ILoginHandler = IHandleable<[string | URL], void>
export default ILoginHandler
