/**
 * Handler for the Legacy Implicit Flow
 */
import IOIDCHandler from "../IOIDCHandler";
import IOIDCOptions from "../IOIDCOptions";
import URL from "url-parse";
import { inject, injectable } from "tsyringe";
import { IFetcher } from "../../../util/Fetcher";
import { IDPoPHeaderCreator } from "../../../util/dpop/DPoPHeaderCreator";

@injectable()
export default class LegacyImplicitFlowOIDCHandler implements IOIDCHandler {
  constructor(
    @inject("fetcher") private fetcher: IFetcher,
    @inject("dPoPHeaderCreator") private dPoPHeaderCreator: IDPoPHeaderCreator
  ) {}

  async canHandle(oidcLoginOptions: IOIDCOptions): Promise<boolean> {
    return !!(
      oidcLoginOptions.issuerConfiguration.grant_types_supported &&
      oidcLoginOptions.issuerConfiguration.grant_types_supported.indexOf(
        "implicit"
      ) > -1
    );
  }

  async handle(oidcLoginOptions: IOIDCOptions): Promise<void> {
    const requestUrl = new URL(
      oidcLoginOptions.issuerConfiguration.authorization_endpoint.toString()
    );
    // TODO: include client_id, state, and nonce
    const query: { [key: string]: any } = {
      response_type: "id_token token",
      redirect_url: oidcLoginOptions.redirectUrl.toString(),
      scope: "openid id_vc"
    };
    if (oidcLoginOptions.dpop) {
      query.dpop = await this.dPoPHeaderCreator.createHeaderToken(
        oidcLoginOptions.issuer,
        "GET"
      );
    }
    requestUrl.set("query", query);

    // TODO: A lot of this seems to be sharable between different flows. Consider making sharable
    // code
    // TODO: This is browser specific. Figure out the right way to do this outside the browser
    window.location.href = requestUrl.toString();
    // TODO: Handle if redirect is not the case
    console.error("BAD LOCATION");
  }
}
