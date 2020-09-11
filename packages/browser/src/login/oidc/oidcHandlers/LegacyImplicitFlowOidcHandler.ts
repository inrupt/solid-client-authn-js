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
 * @hidden
 * @packageDocumentation
 */

/**
 * Handler for the Legacy Implicit Flow
 */
import {
  IOidcHandler,
  IOidcOptions,
  IRedirector,
  ISessionInfoManager,
  IStorageUtility,
} from "@inrupt/solid-client-authn-core";
import URL from "url-parse";
import { inject, injectable } from "tsyringe";
import { IFetcher } from "../../../util/Fetcher";
import { IDpopHeaderCreator } from "../../../dpop/DpopHeaderCreator";
import { IDpopClientKeyManager } from "../../../dpop/DpopClientKeyManager";

/**
 * @hidden
 */
@injectable()
export default class LegacyImplicitFlowOidcHandler implements IOidcHandler {
  constructor(
    @inject("fetcher") private fetcher: IFetcher,
    @inject("sessionInfoManager")
    private sessionInfoManager: ISessionInfoManager,
    @inject("redirector") private redirector: IRedirector,
    @inject("dpopClientKeyManager")
    private dpopClientKeyManager: IDpopClientKeyManager,
    @inject("dpopHeaderCreator") private dpopHeaderCreator: IDpopHeaderCreator,
    @inject("storageUtility") private storageUtility: IStorageUtility
  ) {}

  async canHandle(oidcLoginOptions: IOidcOptions): Promise<boolean> {
    return !!(
      oidcLoginOptions.issuerConfiguration.grantTypesSupported &&
      oidcLoginOptions.issuerConfiguration.grantTypesSupported.indexOf(
        "implicit"
      ) > -1
    );
  }

  async handle(oidcLoginOptions: IOidcOptions): Promise<void> {
    const requestUrl = new URL(
      oidcLoginOptions.issuerConfiguration.authorizationEndpoint.toString()
    );
    // // TODO: include nonce
    // Disable camel case rule because this query requires camel case
    /* eslint-disable @typescript-eslint/camelcase */
    const query: Record<string, string> = {
      client_id: oidcLoginOptions.client.clientId,
      response_type: "id_token token",
      redirect_uri: oidcLoginOptions.redirectUrl.toString(),
      // The webid scope does not appear in the spec
      scope: "openid webid offline_access",
      state: oidcLoginOptions.sessionId,
    };

    await Promise.all([
      this.dpopClientKeyManager.generateClientKeyIfNotAlready(),
      this.storageUtility.setForUser(
        oidcLoginOptions.sessionId,
        {
          isLoggedIn: "false",
          sessionId: oidcLoginOptions.sessionId,
        },
        { secure: true }
      ),
    ]);
    /* eslint-enable @typescript-eslint/camelcase */
    // TODO: There is currently no secure storage of the DPoP key
    if (oidcLoginOptions.dpop) {
      query.dpop = await this.dpopHeaderCreator.createHeaderToken(
        oidcLoginOptions.issuer,
        "GET"
      );
    }
    requestUrl.set("query", query);
    const sessionInfo = await this.sessionInfoManager.get(
      oidcLoginOptions.sessionId
    );
    if (!sessionInfo) {
      throw new Error("There was a problem creating a session.");
    }
    // This flow must happen in a browser, which means a redirection
    // should always be possible.
    this.redirector.redirect(requestUrl.toString(), {
      handleRedirect: oidcLoginOptions.handleRedirect,
    });
  }
}
