/**
 * Handler for the Refresh Token Flow
 */
import IOidcHandler from "../IOidcHandler";
import IOidcOptions from "../IOidcOptions";
import NotImplementedError from "../../../util/errors/NotImplementedError";

export default class RefreshTokenOidcHandler implements IOidcHandler {
  async canHandle(oidcLoginOptions: IOidcOptions): Promise<boolean> {
    return false;
  }

  async handle(oidcLoginOptions: IOidcOptions): Promise<void> {
    throw new NotImplementedError("RefreshTokenOidcHandler handle");
  }
}
