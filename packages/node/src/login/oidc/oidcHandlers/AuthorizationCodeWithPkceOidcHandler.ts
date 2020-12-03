/*
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
 * Handler for the Authorization Code with PKCE Flow
 */
import {
  IOidcHandler,
  IOidcOptions,
  IRedirector,
  IStorageUtility,
  LoginResult,
} from "@inrupt/solid-client-authn-core";
import { Issuer, generators } from "openid-client";
import { injectable, inject } from "tsyringe";
import { configToIssuerMetadata } from "../IssuerConfigFetcher";

/**
 * @hidden
 */
@injectable()
export default class AuthorizationCodeWithPkceOidcHandler
  implements IOidcHandler {
  constructor(
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

  async handle(oidcLoginOptions: IOidcOptions): Promise<LoginResult> {
    const issuer = new Issuer(
      configToIssuerMetadata(oidcLoginOptions.issuerConfiguration)
    );
    const client = new issuer.Client({
      client_id: oidcLoginOptions.client.clientId,
      client_secret: oidcLoginOptions.client.clientSecret,
    });
    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);
    const state = generators.state();

    const targetUrl = client.authorizationUrl({
      code_challenge: codeChallenge,
      state,
      response_type: "code",
      redirect_uri: oidcLoginOptions.redirectUrl,
      code_challenge_method: "S256",
      // The offline_access scope asks the provider to issue a refresh token.
      scope: "openid offline_access",
    });

    // Stores information to be reused after reload
    await Promise.all([
      this.storageUtility.setForUser(state, {
        sessionId: oidcLoginOptions.sessionId,
      }),
      this.storageUtility.setForUser(oidcLoginOptions.sessionId, {
        codeVerifier,
        issuer: oidcLoginOptions.issuer,
        redirectUri: oidcLoginOptions.redirectUrl,
        dpop: oidcLoginOptions.dpop ? "true" : "false",
      }),
    ]);

    this.redirector.redirect(targetUrl, {
      handleRedirect: oidcLoginOptions.handleRedirect,
    });
    // The login is only completed AFTER redirect, so there is nothing to return.
    return undefined;
  }
}
