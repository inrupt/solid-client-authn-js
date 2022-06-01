/*
 * Copyright 2022 Inrupt Inc.
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
  DEFAULT_SCOPES,
} from "@inrupt/solid-client-authn-core";
import { OidcClient } from "@inrupt/oidc-client-ext";

/**
 * @hidden
 * Authorization code flow spec: https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowAuth
 * PKCE: https://tools.ietf.org/html/rfc7636
 */
export default class AuthorizationCodeWithPkceOidcHandler
  implements IOidcHandler
{
  constructor(
    private storageUtility: IStorageUtility,
    private redirector: IRedirector
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

    const { redirector } = this;
    const storage = this.storageUtility;

    try {
      const signingRequest = await oidcClientLibrary.createSigninRequest();
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
        storage.setForUser(signingRequest.state._id, {
          sessionId: oidcLoginOptions.sessionId,
        }),

        // Store our login-process state using the session ID as the key.
        // Strictly speaking, this indirection from our OAuth state value to
        // our session ID is unnecessary, but it provides a slightly cleaner
        // separation of concerns.
        storage.setForUser(oidcLoginOptions.sessionId, {
          // eslint-disable-next-line no-underscore-dangle
          codeVerifier: signingRequest.state._code_verifier,
          issuer: oidcLoginOptions.issuer.toString(),
          // The redirect URL is read after redirect, so it must be stored now.
          redirectUrl: oidcLoginOptions.redirectUrl,
          dpop: oidcLoginOptions.dpop ? "true" : "false",
        }),
      ]);

      redirector.redirect(signingRequest.url.toString(), {
        handleRedirect: oidcLoginOptions.handleRedirect,
      });
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error(err);
    }

    // The login is only completed AFTER redirect, so nothing to return here.
    return undefined;
  }
}
