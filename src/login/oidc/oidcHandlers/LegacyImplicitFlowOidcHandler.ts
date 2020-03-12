/**
 * Handler for the Legacy Implicit Flow
 */
import IOidcHandler from "../IOidcHandler";
import IOidcOptions from "../IOidcOptions";
import URL from "url-parse";
import { inject, injectable } from "tsyringe";
import { IFetcher } from "../../../util/Fetcher";
import { IDpopHeaderCreator } from "../../../dpop/DpopHeaderCreator";
import INeededRedirectAction from "../../../solidSession/INeededRedirectAction";
import ISolidSession from "../../../solidSession/ISolidSession";
import { IUuidGenerator } from "../../../util/UuidGenerator";
import { Response } from "node-fetch";

@injectable()
export default class LegacyImplicitFlowOidcHandler implements IOidcHandler {
  constructor(
    @inject("fetcher") private fetcher: IFetcher,
    @inject("dpopHeaderCreator") private dpopHeaderCreator: IDpopHeaderCreator,
    @inject("uuidGenerator") private uuidGenerator: IUuidGenerator
  ) {}

  async canHandle(oidcLoginOptions: IOidcOptions): Promise<boolean> {
    return !!(
      oidcLoginOptions.issuerConfiguration.grantTypesSupported &&
      oidcLoginOptions.issuerConfiguration.grantTypesSupported.indexOf(
        "implicit"
      ) > -1
    );
  }

  async handle(oidcLoginOptions: IOidcOptions): Promise<ISolidSession> {
    const requestUrl = new URL(
      oidcLoginOptions.issuerConfiguration.authorizationEndpoint.toString()
    );
    // TODO: include client_id, state, and nonce
    // Disable camel case rule because this query requires camel case
    /* eslint-disable @typescript-eslint/camelcase */
    const query: { [key: string]: string } = {
      response_type: "id_token token",
      redirect_url: oidcLoginOptions.redirectUrl.toString(),
      scope: "openid id_vc"
    };
    /* eslint-enable @typescript-eslint/camelcase */
    if (oidcLoginOptions.dpop) {
      query.dpop = await this.dpopHeaderCreator.createHeaderToken(
        oidcLoginOptions.issuer,
        "GET"
      );
    }
    requestUrl.set("query", query);

    // TODO: This is shared in multiple places. Perhaps abstract it out
    return {
      localUserId: this.uuidGenerator.v4(),
      neededAction: {
        actionType: "redirect",
        redirectUrl: requestUrl.toString()
      } as INeededRedirectAction,
      logout: (): Promise<void> => {
        return Promise.resolve();
      },
      fetch: (): Promise<Response> => {
        throw new Error("not implemented");
      }
    };
  }
}
