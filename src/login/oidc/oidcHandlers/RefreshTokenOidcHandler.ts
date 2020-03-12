/**
 * Handler for the Refresh Token Flow
 */
import IOidcHandler from "../IOidcHandler";
import IOidcOptions from "../IOidcOptions";
import NotImplementedError from "../../../errors/NotImplementedError";
import ISolidSession from "../../../solidSession/ISolidSession";

export default class RefreshTokenOidcHandler implements IOidcHandler {
  async canHandle(oidcLoginOptions: IOidcOptions): Promise<boolean> {
    return false;
  }

  async handle(oidcLoginOptions: IOidcOptions): Promise<ISolidSession> {
    throw new NotImplementedError("RefreshTokenOidcHandler handle");
  }
}
