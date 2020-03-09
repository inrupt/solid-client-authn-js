import ISolidSession from "../../../ISolidSession";
import IRedirectHandler from "./IRedirectHandler";
import URL from "url-parse";
import ConfigurationError from "../../..//errors/ConfigurationError";
import { Response, RequestInfo, RequestInit } from "node-fetch";
import { inject, injectable } from "tsyringe";
import IJoseUtility from "../../../jose/IJoseUtility";

@injectable()
export default class GeneralRedirectHandler implements IRedirectHandler {
  constructor(@inject("joseUtility") private joseUtility: IJoseUtility) {}

  async canHandle(redirectUrl: string): Promise<boolean> {
    const url = new URL(redirectUrl, true);
    return !!(url.query && url.query.id_token && url.query.access_token);
  }
  async handle(redirectUrl: string): Promise<ISolidSession> {
    if (!(await this.canHandle(redirectUrl))) {
      throw new ConfigurationError(`Cannot handle redirect url ${redirectUrl}`);
    }
    const url = new URL(redirectUrl, true);
    const decoded = await this.joseUtility.decodeJWT(
      url.query.id_token as string
    );
    // TODO validate decoded token
    return {
      webId: decoded.sub,
      state: url.query.state,
      logout: async (): Promise<void> => {
        console.log("Logging Out");
      },
      fetch: async (url: RequestInfo, init: RequestInit): Promise<Response> => {
        throw new Error("Not Implemented");
      }
    };
  }
}
