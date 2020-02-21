/**
 * OidcHandlers handle the login process for a given IDP (as defined by the OIDC Options)
 */
import IHandleable from "../../util/handlerPattern/IHandleable";
import IOidcOptions from "./IOidcOptions";

type IOidcHandler = IHandleable<[IOidcOptions], void>;
export default IOidcHandler;
