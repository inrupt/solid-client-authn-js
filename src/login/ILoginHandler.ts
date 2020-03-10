/**
 * A Login Handler will log a user in if it is able to use the provided Login Parameters
 */
import IHandleable from "../util/handlerPattern/IHandleable";
import ILoginOptions from "./ILoginOptions";
import INeededAction from "../neededAction/INeededAction";

type ILoginHandler = IHandleable<[ILoginOptions], INeededAction>;
export default ILoginHandler;
