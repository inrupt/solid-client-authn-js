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
import type IStorageUtility from "../../../storage/IStorageUtility";
import type IOidcOptions from "../IOidcOptions";
import type { IRedirector } from "../IRedirector";

/**
 * @hidden
 * @packageDocumentation
 */

/**
 * @hidden
 * Authorization code flow spec: https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowAuth
 * PKCE: https://tools.ietf.org/html/rfc7636
 */
export default abstract class AuthorizationCodeWithPkceOidcHandlerBase {
  constructor(
    protected storageUtility: IStorageUtility,
    protected redirector: IRedirector,
  ) {
    this.storageUtility = storageUtility;
    this.redirector = redirector;
  }

  async canHandle(oidcLoginOptions: IOidcOptions): Promise<boolean> {
    return !!(
      oidcLoginOptions.issuerConfiguration.grantTypesSupported &&
      oidcLoginOptions.issuerConfiguration.grantTypesSupported.indexOf(
        "authorization_code",
      ) > -1
    );
  }

  async handleRedirect({
    oidcLoginOptions,
    state,
    codeVerifier,
    targetUrl,
  }: {
    oidcLoginOptions: IOidcOptions;
    state: string;
    codeVerifier: string;
    targetUrl: string;
  }) {
    await Promise.all([
      // We use the OAuth 'state' value (which should be crypto-random) as
      // the key in our storage to store our actual SessionID. We do this
      // 'cos we'll need to lookup our session information again when the
      // browser is redirected back to us (i.e. the OAuth client
      // application) from the Authorization Server.
      // We don't want to use our session ID as the OAuth 'state' value, as
      // that session ID can be any developer-specified value, and therefore
      // may not be appropriate (since the OAuth 'state' value should really
      // be an unguessable crypto-random value).
      // eslint-disable-next-line no-underscore-dangle
      this.storageUtility.setForUser(state, {
        sessionId: oidcLoginOptions.sessionId,
      }),

      // Store our login-process state using the session ID as the key.
      // Strictly speaking, this indirection from our OAuth state value to
      // our session ID is unnecessary, but it provides a slightly cleaner
      // separation of concerns.
      this.storageUtility.setForUser(oidcLoginOptions.sessionId, {
        // eslint-disable-next-line no-underscore-dangle
        codeVerifier,
        issuer: oidcLoginOptions.issuer.toString(),
        // The redirect URL is read after redirect, so it must be stored now.
        redirectUrl: oidcLoginOptions.redirectUrl,
        dpop: oidcLoginOptions.dpop ? "true" : "false",
      }),
    ]);

    this.redirector.redirect(targetUrl, {
      handleRedirect: oidcLoginOptions.handleRedirect,
    });

    return undefined;
  }
}
