import ISolidSession from "../../../solidSession/ISolidSession";
import IRedirectHandler from "./IRedirectHandler";
import URL from "url-parse";
import ConfigurationError from "../../..//errors/ConfigurationError";
import { inject, injectable } from "tsyringe";
import { ITokenSaver } from "./TokenSaver";

@injectable()
export default class GeneralRedirectHandler implements IRedirectHandler {
  constructor(@inject("tokenSaver") private tokenSaver: ITokenSaver) {}

  async canHandle(redirectUrl: string): Promise<boolean> {
    const url = new URL(redirectUrl, true);
    return !!(
      url.query &&
      url.query.id_token &&
      url.query.access_token &&
      url.query.state
    );
  }
  async handle(redirectUrl: string): Promise<ISolidSession> {
    if (!(await this.canHandle(redirectUrl))) {
      throw new ConfigurationError(`Cannot handle redirect url ${redirectUrl}`);
    }
    const url = new URL(redirectUrl, true);

    return this.tokenSaver.saveTokenAndGetSession(
      url.query.state as string,
      url.query.id_token as string,
      url.query.access_token
    );
  }
}
