/**
 * Handles login if a user's webid was provided
 */
import ILoginHandler from "../ILoginHandler";
import ILoginOptions from "../ILoginOptions";

export default class WebidLoginHandler implements ILoginHandler {
  async canHandle(loginOptions: ILoginOptions): Promise<boolean> {
    return false;
  }

  /**
   * Handles a given WebID by first dereferencing the WebId, then creating correct login options for
   * a future login handler and triggering that login handler. For example, if a WebID contains an
   * 'oidcIssuer' triple, it will create login credentials to match that
   * @param loginOptions
   */
  async handle(loginOptions: ILoginOptions): Promise<string> {
    // TODO: implement
    throw new Error("Not Implemented");
  }
}
