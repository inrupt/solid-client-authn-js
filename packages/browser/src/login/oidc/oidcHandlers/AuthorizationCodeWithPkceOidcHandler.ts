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
} from "@inrupt/solid-client-authn-core";
import URL from "url-parse";
import { injectable, inject } from "tsyringe";
import IJoseUtility from "../../../jose/IJoseUtility";

/**
 * @hidden
 */
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
      filterProtocolClaims: true,
      // The userinfo endpoint on NSS fails, so disable this for now
      // Note that in Solid, information should be retrieved from the
      // profile referenced by the WebId.
      loadUserInfo: false,
      code_verifier: true,
    };
    /* eslint-enable @typescript-eslint/camelcase */
    requestUrl.set("query", query);
    // TODO: This is inefficent, there should be a bulk
    await this.storageUtility.setForUser(oidcLoginOptions.sessionId, {
      codeVerifier,
      issuer: oidcLoginOptions.issuer.toString(),
      redirectUri: oidcLoginOptions.redirectUrl.toString(),
    });

    const oidcClientLibrary = new OidcClient(oidcOptions);

    const redirector = this.redirector;
    const storage = this.storageUtility;

    return (
      oidcClientLibrary
        .createSigninRequest()
        .then(async function (req: SigninRequest) {
          // We use the OAuth 'state' value (which should be crypto-random) as
          // the key in our storage to store our actual SessionID. We do this 'cos
          // we'll need to lookup our session information again when the browser
          // is redirected back to us (i.e. the OAuth client application) from the
          // Authorization Server.
          // We don't want to use our session ID as the OAuth 'state' value, as
          // that session ID can be any developer-specified value, and therefore
          // may not be appropriate (since the OAuth 'state' value should really
          // be an unguessable crypto-random value).
          await Promise.all([
            storage.setForUser(req.state._id, {
              sessionId: oidcLoginOptions.sessionId,
            }),
            storage.setForUser(oidcLoginOptions.sessionId, {
              codeVerifier: req.state._code_verifier,
              issuer: oidcLoginOptions.issuer.toString(),
              redirectUri: oidcLoginOptions.redirectUrl.toString(),
              dpop: oidcLoginOptions.dpop ? "true" : "false",
            }),
          ]);

          redirector.redirect(req.url.toString(), {
            handleRedirect: oidcLoginOptions.handleRedirect,
          });
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .catch((err: unknown) => {
          console.error(err);
        })
    );
  }
}
