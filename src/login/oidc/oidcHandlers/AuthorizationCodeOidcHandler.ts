/**
 * Handler for the Authorization Code Flow
 */
import IOidcHandler from "../IOidcHandler";
import IOidcOptions from "../IOidcOptions";
import NotImplementedError from "../../../errors/NotImplementedError";
import INeededAction from "../../../neededAction/INeededAction";

export default class AuthorizationCodeOidcHandler implements IOidcHandler {
  async canHandle(oidcLoginOptions: IOidcOptions): Promise<boolean> {
    return false;
  }

  async handle(oidcLoginOptions: IOidcOptions): Promise<INeededAction> {
    throw new NotImplementedError("AuthorizationCodeOidcHandler handle");
  }
}
