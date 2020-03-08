/**
 * Handler for the Client Credentials Flow
 */
import IOidcHandler from "../IOidcHandler";
import IOidcOptions from "../IOidcOptions";
import NotImplementedError from "../../../errors/NotImplementedError";

export default class ClientCredentialsOidcHandler implements IOidcHandler {
  async canHandle(oidcLoginOptions: IOidcOptions): Promise<boolean> {
    return false;
  }

  async handle(oidcLoginOptions: IOidcOptions): Promise<string> {
    throw new NotImplementedError("ClientCredentialsOidcHandler handle");
  }
}
