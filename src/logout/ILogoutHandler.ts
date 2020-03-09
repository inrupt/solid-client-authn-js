import IHandleable from "../util/handlerPattern/IHandleable";

type ILogoutHandler = IHandleable<[string], void>;
export default ILogoutHandler;
