/**
 * OidcHandlers handle the login process for a given IDP (as defined by the OIDC Options)
 */
import IHandleable from "../../util/handlerPattern/IHandleable";
import IOidcOptions from "./IOidcOptions";
import INeededAction from "../../neededAction/INeededAction";

type IOidcHandler = IHandleable<[IOidcOptions], INeededAction>;
export default IOidcHandler;
