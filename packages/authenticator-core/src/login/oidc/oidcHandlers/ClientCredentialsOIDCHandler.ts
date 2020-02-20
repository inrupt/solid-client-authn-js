/**
 * Handler for the Client Credentials Flow
 */
import IOIDCHandler from "../IOIDCHandler";
import IOIDCOptions from "../IOIDCOptions";
import NotImplementedError from "../../../util/errors/NotImplementedError";

export default class ClientCredentialsOIDCHandler implements IOIDCHandler {
  async canHandle(oidcLoginOptions: IOIDCOptions): Promise<boolean> {
    return false;
  }

  async handle(oidcLoginOptions: IOIDCOptions): Promise<void> {
    throw new NotImplementedError("ClientCredentialsOIDCHandler handle");
  }
}
