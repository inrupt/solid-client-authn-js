/**
 * Handler for the Authorization Code with PKCE Flow
 */
import IOidcHandler from "../IOidcHandler";
import IOidcOptions from "../IOidcOptions";
import NotImplementedError from "../../../errors/NotImplementedError";
import ISolidSession from "../../../solidSession/ISolidSession";

export default class AuthorizationCodeWithPkceOidcHandler
  implements IOidcHandler {
  async canHandle(oidcLoginOptions: IOidcOptions): Promise<boolean> {
    return false;
  }

  async handle(oidcLoginOptions: IOidcOptions): Promise<ISolidSession> {
    throw new NotImplementedError(
      "AuthorizationCodeWithPkceOidcHandler handle"
    );
  }
}
