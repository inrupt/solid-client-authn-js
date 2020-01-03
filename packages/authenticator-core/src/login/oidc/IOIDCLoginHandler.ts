import IHandleable from '../../util/handlerPattern/IHandleable'
import IOIDCLoginOptions from './IOIDCLoginOptions'

type IOIDCLoginHandler = IHandleable<[IOIDCLoginOptions], void>
export default IOIDCLoginHandler
