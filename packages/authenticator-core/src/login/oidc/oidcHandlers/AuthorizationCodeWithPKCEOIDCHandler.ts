/**
 * Handler for the Authorization Code with PKCE Flow
 */
import IOidcHandler from "../IOidcHandler";
import IOidcOptions from "../IOidcOptions";
import NotImplementedError from "../../../util/errors/NotImplementedError";

export default class AuthorizationCodeWithPkceOidcHandler
  implements IOidcHandler {
  async canHandle(oidcLoginOptions: IOidcOptions): Promise<boolean> {
    return false;
  }

  async handle(oidcLoginOptions: IOidcOptions): Promise<void> {
    throw new NotImplementedError(
      "AuthorizationCodeWithPkceOidcHandler handle"
    );
  }
}
