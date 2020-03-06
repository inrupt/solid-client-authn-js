/**
 * Handler for the Authorization Code Flow
 */
import IOidcHandler from "../IOidcHandler";
import IOidcOptions from "../IOidcOptions";
import NotImplementedError from "../../../errors/NotImplementedError";

export default class AuthorizationCodeOidcHandler implements IOidcHandler {
  async canHandle(oidcLoginOptions: IOidcOptions): Promise<boolean> {
    return false;
  }

  async handle(oidcLoginOptions: IOidcOptions): Promise<void> {
    throw new NotImplementedError("AuthorizationCodeOidcHandler handle");
  }
}
