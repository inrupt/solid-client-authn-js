/*
 * Copyright 2021 Inrupt Inc.
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
  LoginResult,
} from "@inrupt/solid-client-authn-core";
import { inject, injectable } from "tsyringe";
import { generateJwkForDpop, createDpopHeader } from "@inrupt/oidc-client-ext";

/**
 * @hidden
 */
@injectable()
export default class LegacyImplicitFlowOidcHandler implements IOidcHandler {
  constructor(
    @inject("sessionInfoManager")
    private sessionInfoManager: ISessionInfoManager,
    @inject("redirector") private redirector: IRedirector,
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

  async handle(oidcLoginOptions: IOidcOptions): Promise<LoginResult> {
    // // TODO: include nonce
    // Disable camel case rule because this query requires camel case
    /* eslint-disable camelcase */
    const query: Record<string, string> = {
      client_id: oidcLoginOptions.client.clientId,
      response_type: "id_token token",
      redirect_uri: oidcLoginOptions.redirectUrl,
      // The webid scope does not appear in the spec
      scope: "openid webid offline_access",
      state: oidcLoginOptions.sessionId,
    };

    const [key] = await Promise.all([
      generateJwkForDpop(),
      this.storageUtility.setForUser(
        oidcLoginOptions.sessionId,
        {
          isLoggedIn: "false",
          sessionId: oidcLoginOptions.sessionId,
        },
        { secure: true }
      ),
    ]);
    /* eslint-enable camelcase */
    // TODO: There is currently no secure storage of the DPoP key
    if (oidcLoginOptions.dpop) {
      query.dpop = await createDpopHeader(oidcLoginOptions.issuer, "GET", key);
    }

    const sessionInfo = await this.sessionInfoManager.get(
      oidcLoginOptions.sessionId
    );
    if (!sessionInfo) {
      throw new Error("There was a problem creating a session.");
    }

    const requestUrl = new URL(
      oidcLoginOptions.issuerConfiguration.authorizationEndpoint
    );
    for (const queryParamkey of Object.keys(query)) {
      requestUrl.searchParams.set(queryParamkey, query[queryParamkey]);
    }

    // This flow must happen in a browser, which means a redirection
    // should always be possible.
    this.redirector.redirect(requestUrl.toString(), {
      handleRedirect: oidcLoginOptions.handleRedirect,
    });
    // The login is only completed AFTER redirect, so nothing to return here.
    return undefined;
  }
}
