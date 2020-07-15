/**
 * This project is a continuation of Inrupt's awesome solid-auth-fetcher project,
 * see https://www.npmjs.com/package/@inrupt/solid-auth-fetcher.
 * Copyright 2020 The Solid Project.
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
import ISolidSession from "../../../solidSession/ISolidSession";
import { injectable, inject } from "tsyringe";
import { ISessionCreator } from "../../../solidSession/SessionCreator";
import IJoseUtility from "../../../jose/IJoseUtility";
import { IStorageUtility } from "../../../localStorage/StorageUtility";
import { IRedirector } from "../Redirector";

@injectable()
export default class AuthorizationCodeWithPkceOidcHandler
  implements IOidcHandler {
  constructor(
    @inject("sessionCreator") private sessionCreator: ISessionCreator,
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

  async handle(oidcLoginOptions: IOidcOptions): Promise<ISolidSession> {
    const requestUrl = new URL(
      oidcLoginOptions.issuerConfiguration.authorizationEndpoint.toString()
    );
    const codeVerifier = await this.joseUtility.generateCodeVerifier();
    const session = this.sessionCreator.create({
      localUserId: oidcLoginOptions.localUserId,
      loggedIn: false
    });
    // Disable camel case rule because this query requires camel case
    /* eslint-disable @typescript-eslint/camelcase */
    const query: { [key: string]: string } = {
      response_type: "id_token code",
      redirect_uri: oidcLoginOptions.redirectUrl.toString(),
      scope: "openid profile offline_access",
      client_id: oidcLoginOptions.client.clientId,
      code_challenge_method: "S256",
      code_challenge: await this.joseUtility.generateCodeChallenge(
        codeVerifier
      ),
      state: session.localUserId
    };
    /* eslint-enable @typescript-eslint/camelcase */
    requestUrl.set("query", query);

    // TODO: This is inefficent, there should be a bulk
    await this.storageUtility.setForUser(
      session.localUserId,
      "codeVerifier",
      codeVerifier
    );
    await this.storageUtility.setForUser(
      session.localUserId,
      "issuer",
      oidcLoginOptions.issuer.toString()
    );
    await this.storageUtility.setForUser(
      session.localUserId,
      "clientId",
      oidcLoginOptions.client.clientId
    );
    await this.storageUtility.setForUser(
      session.localUserId,
      "redirectUri",
      oidcLoginOptions.redirectUrl.toString()
    );
    if (oidcLoginOptions.client.clientSecret) {
      await this.storageUtility.setForUser(
        session.localUserId,
        "clientSecret",
        oidcLoginOptions.client.clientSecret
      );
    }

    session.neededAction = this.redirector.redirect(requestUrl.toString(), {
      doNotAutoRedirect: !!oidcLoginOptions.doNotAutoRedirect
    });

    return session;
  }
}
