//
// Copyright Inrupt Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
// Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

/**
 * @hidden
 * @packageDocumentation
 */

/**
 * Handler for the Authorization Code with PKCE Flow
 */
import type {
  IOidcHandler,
  IOidcOptions,
  LoginResult,
} from "@inrupt/solid-client-authn-core";
import {
  DEFAULT_SCOPES,
  AuthorizationCodeWithPkceOidcHandlerBase,
} from "@inrupt/solid-client-authn-core";
import { Issuer, generators } from "openid-client";
import { configToIssuerMetadata } from "../IssuerConfigFetcher";

/**
 * @hidden
 * Authorization code flow spec: https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowAuth
 * PKCE: https://tools.ietf.org/html/rfc7636
 */
export default class AuthorizationCodeWithPkceOidcHandler
  extends AuthorizationCodeWithPkceOidcHandlerBase
  implements IOidcHandler
{
  async handle(oidcLoginOptions: IOidcOptions): Promise<LoginResult> {
    const issuer = new Issuer(
      configToIssuerMetadata(oidcLoginOptions.issuerConfiguration),
    );
    const client = new issuer.Client({
      client_id: oidcLoginOptions.client.clientId,
      client_secret: oidcLoginOptions.client.clientSecret,
    });
    const codeVerifier = generators.codeVerifier();
    const state = generators.state();

    const targetUrl = client.authorizationUrl({
      code_challenge: generators.codeChallenge(codeVerifier),
      state,
      response_type: "code",
      redirect_uri: oidcLoginOptions.redirectUrl,
      code_challenge_method: "S256",
      prompt: "consent",
      scope: DEFAULT_SCOPES,
    });

    return this.handleRedirect({
      oidcLoginOptions,
      state,
      codeVerifier,
      targetUrl,
    });
  }
}
