import ISolidSession from "../../../solidSession/ISolidSession";
import IRedirectHandler from "./IRedirectHandler";
import URL from "url-parse";
import ConfigurationError from "../../..//errors/ConfigurationError";
import { inject, injectable } from "tsyringe";
import { ISessionCreator } from "../../../solidSession/SessionCreator";

@injectable()
export default class InactionRedirectHandler implements IRedirectHandler {
  constructor(
    @inject("sessionCreator") private sessionCreator: ISessionCreator
  ) {}

  async canHandle(redirectUrl: string): Promise<boolean> {
    return true;
  }
  async handle(redirectUrl: string): Promise<ISolidSession> {
    return this.sessionCreator.create({
      loggedIn: false
    });
  }
}
