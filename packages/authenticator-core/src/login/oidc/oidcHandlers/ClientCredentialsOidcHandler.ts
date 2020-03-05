/**
 * Handler for the Client Credentials Flow
 */
import IOidcHandler from "../IOidcHandler";
import IOidcOptions from "../IOidcOptions";
import NotImplementedError from "../../../util/errors/NotImplementedError";

export default class ClientCredentialsOidcHandler implements IOidcHandler {
  async canHandle(oidcLoginOptions: IOidcOptions): Promise<boolean> {
    return false;
  }

  async handle(oidcLoginOptions: IOidcOptions): Promise<void> {
    throw new NotImplementedError("ClientCredentialsOidcHandler handle");
  }
}
