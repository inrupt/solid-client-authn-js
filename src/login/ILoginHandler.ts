/**
 * A Login Handler will log a user in if it is able to use the provided Login Parameters
 */
import IHandleable from "../util/handlerPattern/IHandleable";
import ILoginOptions from "./ILoginOptions";
import ISolidSession from "../solidSession/ISolidSession";

type ILoginHandler = IHandleable<[ILoginOptions], ISolidSession>;
export default ILoginHandler;
