import IHandleable from "../../../util/handlerPattern/IHandleable";
import ISolidSession from "../../../ISolidSession";

type IRedirectHandler = IHandleable<[string], ISolidSession>;
export default IRedirectHandler;
