/**
 * Copyright 2020 Inrupt Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * Handler for the Legacy Implicit Flow
 */
import IOidcHandler from "../IOidcHandler";
import IOidcOptions, { IAccessTokenOidcOptions } from "../IOidcOptions";
import URL from "url-parse";
import { inject, injectable } from "tsyringe";
import { IFetcher } from "../../../util/Fetcher";
import { IDpopHeaderCreator } from "../../../dpop/DpopHeaderCreator";
import ISessionInfo from "../../../sessionInfo/ISessionInfo";
import { ISessionCreator } from "../../../sessionInfo/SessionCreator";

@injectable()
export default class LegacyImplicitFlowOidcHandler implements IOidcHandler {
  constructor(
    @inject("fetcher") private fetcher: IFetcher,
    @inject("dpopHeaderCreator") private dpopHeaderCreator: IDpopHeaderCreator,
    @inject("sessionCreator") private sessionCreator: ISessionCreator
  ) {}

  async canHandle(oidcLoginOptions: IOidcOptions): Promise<boolean> {
    return !!(
      oidcLoginOptions.issuerConfiguration.grantTypesSupported &&
      oidcLoginOptions.issuerConfiguration.grantTypesSupported.indexOf(
        "implicit"
      ) > -1
    );
  }

  async handle(oidcLoginOptions: IOidcOptions): Promise<ISessionInfo> {
    throw new Error("Not Implemented");

    // const requestUrl = new URL(
    //   oidcLoginOptions.issuerConfiguration.authorizationEndpoint.toString()
    // );
    // // TODO: include client_id, state, and nonce
    // // Disable camel case rule because this query requires camel case
    // /* eslint-disable @typescript-eslint/camelcase */
    // const query: { [key: string]: string } = {
    //   response_type: "id_token token",
    //   redirect_url: oidcLoginOptions.redirectUrl.toString(),
    //   scope: "openid id_vc"
    // };
    // /* eslint-enable @typescript-eslint/camelcase */
    // if (oidcLoginOptions.dpop) {
    //   query.dpop = await this.dpopHeaderCreator.createHeaderToken(
    //     oidcLoginOptions.issuer,
    //     "GET"
    //   );
    // }
    // requestUrl.set("query", query);

    // return this.sessionCreator.create({
    //   neededAction: {
    //     actionType: "redirect",
    //     redirectUrl: requestUrl.toString()
    //   },
    //   loggedIn: false
    // });
  }
}
