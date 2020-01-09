import IHandleable from '../../util/handlerPattern/IHandleable'
import IOIDCLoginOptions from './IOIDCOptions'

type IOIDCHandler = IHandleable<[IOIDCLoginOptions], void>
export default IOIDCHandler
