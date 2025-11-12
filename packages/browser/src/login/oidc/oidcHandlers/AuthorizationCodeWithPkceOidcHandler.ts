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
import { AuthorizationCodeWithPkceOidcHandlerBase } from "@inrupt/solid-client-authn-core";
import { OidcClient } from "@inrupt/oidc-client-ext";

// Camelcase identifiers are required in the OIDC specification.
/* eslint-disable camelcase*/

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
    const oidcOptions = {
      authority: oidcLoginOptions.issuer.toString(),
      client_id: oidcLoginOptions.client.clientId,
      client_secret: oidcLoginOptions.client.clientSecret,
      redirect_uri: oidcLoginOptions.redirectUrl,
      response_type: "code",
      scope: oidcLoginOptions.scopes.join(" "),
      filterProtocolClaims: true,
      // The userinfo endpoint on NSS fails, so disable this for now
      // Note that in Solid, information should be retrieved from the
      // profile referenced by the WebId.
      loadUserInfo: false,
      code_verifier: true,
      prompt: oidcLoginOptions.prompt ?? "consent",
    };

    const oidcClientLibrary = new OidcClient(oidcOptions);

    try {
      const signingRequest = await oidcClientLibrary.createSigninRequest();
      // Make sure to await the promise before returning so that the error is caught.
      return await this.setupRedirectHandler({
        oidcLoginOptions,

        state: signingRequest.state._id,

        codeVerifier: signingRequest.state._code_verifier,
        targetUrl: signingRequest.url.toString(),
      });
    } catch (err: unknown) {
      console.error(err);
    }

    // The login is only completed AFTER redirect, so nothing to return here.
    return undefined;
  }
}
