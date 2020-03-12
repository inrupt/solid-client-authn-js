import IHandleable from "../../../util/handlerPattern/IHandleable";
import ISolidSession from "../../../solidSession/ISolidSession";

type IRedirectHandler = IHandleable<[string], ISolidSession>;
export default IRedirectHandler;
