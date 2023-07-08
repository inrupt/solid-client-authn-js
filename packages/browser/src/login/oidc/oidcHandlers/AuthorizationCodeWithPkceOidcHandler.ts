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
import { OidcClient } from "@inrupt/oidc-client-ext";

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
    /* eslint-disable camelcase */
    const oidcOptions = {
      authority: oidcLoginOptions.issuer.toString(),
      client_id: oidcLoginOptions.client.clientId,
      client_secret: oidcLoginOptions.client.clientSecret,
      redirect_uri: oidcLoginOptions.redirectUrl.toString(),
      post_logout_redirect_uri: oidcLoginOptions.redirectUrl.toString(),
      response_type: "code",
      scope: DEFAULT_SCOPES,
      filterProtocolClaims: true,
      // The userinfo endpoint on NSS fails, so disable this for now
      // Note that in Solid, information should be retrieved from the
      // profile referenced by the WebId.
      loadUserInfo: false,
      code_verifier: true,
      prompt: oidcLoginOptions.prompt ?? "consent",
    };
    /* eslint-enable camelcase */

    const oidcClientLibrary = new OidcClient(oidcOptions);

    try {
      const signingRequest = await oidcClientLibrary.createSigninRequest();
      // Make sure to await the promise before returning so that the error is caught.
      return await this.handleRedirect({
        oidcLoginOptions,
        // eslint-disable-next-line no-underscore-dangle
        state: signingRequest.state._id,
        // eslint-disable-next-line no-underscore-dangle
        codeVerifier: signingRequest.state._code_verifier,
        targetUrl: signingRequest.url.toString(),
      });
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error(err);
    }

    // The login is only completed AFTER redirect, so nothing to return here.
    return undefined;
  }
}
