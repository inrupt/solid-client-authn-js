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
 * Handler for the Authorization Code with PKCE Flow
 */
import IOidcHandler from "../IOidcHandler";
import IOidcOptions from "../IOidcOptions";
import URL from "url-parse";
import { injectable, inject } from "tsyringe";
import IJoseUtility from "../../../jose/IJoseUtility";
import { IStorageUtility } from "../../../storage/StorageUtility";
import { IRedirector } from "../Redirector";

@injectable()
export default class AuthorizationCodeWithPkceOidcHandler
  implements IOidcHandler {
  constructor(
    @inject("joseUtility") private joseUtility: IJoseUtility,
    @inject("storageUtility") private storageUtility: IStorageUtility,
    @inject("redirector") private redirector: IRedirector
  ) {}

  async canHandle(oidcLoginOptions: IOidcOptions): Promise<boolean> {
    return !!(
      oidcLoginOptions.issuerConfiguration.grantTypesSupported &&
      oidcLoginOptions.issuerConfiguration.grantTypesSupported.indexOf(
        "authorization_code"
      ) > -1
    );
  }

  async handle(oidcLoginOptions: IOidcOptions): Promise<void> {
    const requestUrl = new URL(
      oidcLoginOptions.issuerConfiguration.authorizationEndpoint.toString()
    );
    const codeVerifier = await this.joseUtility.generateCodeVerifier();
    // Disable camel case rule because this query requires camel case
    /* eslint-disable @typescript-eslint/camelcase */
    const query: { [key: string]: string } = {
      response_type: "code id_token",
      redirect_uri: oidcLoginOptions.redirectUrl.toString(),
      // TODO: the 'webid' scope does not appear in the specification
      // A question regarding its use has been filed https://github.com/solid/specification
      scope: "openid webid offline_access",
      client_id: oidcLoginOptions.client.clientId,
      code_challenge_method: "S256",
      code_challenge: await this.joseUtility.generateCodeChallenge(
        codeVerifier
      ),
      state: oidcLoginOptions.sessionId
    };
    /* eslint-enable @typescript-eslint/camelcase */
    requestUrl.set("query", query);
    console.log(
      `Storing code verifier ${codeVerifier} for session ${oidcLoginOptions.sessionId}`
    );
    // TODO: This is inefficent, there should be a bulk
    await this.storageUtility.setForUser(oidcLoginOptions.sessionId, {
      codeVerifier,
      issuer: oidcLoginOptions.issuer.toString(),
      redirectUri: oidcLoginOptions.redirectUrl.toString()
    });

    this.redirector.redirect(requestUrl.toString(), {
      handleRedirect: oidcLoginOptions.handleRedirect
    });
  }
}
