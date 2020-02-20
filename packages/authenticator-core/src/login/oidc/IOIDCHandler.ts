/**
 * OIDCHandlers handle the login process for a given IDP (as defined by the OIDC Options)
 */
import IHandleable from "../../util/handlerPattern/IHandleable";
import IOIDCOptions from "./IOIDCOptions";

type IOIDCHandler = IHandleable<[IOIDCOptions], void>;
export default IOIDCHandler;
