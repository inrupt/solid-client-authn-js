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
// ---------------------------------------------------------------------------
// MIGRATION: oauth4webapi + dpop — Phase 4 (proposal/migrate-to-oauth4webapi)
// ---------------------------------------------------------------------------
// Before: PKCE/state generation and the authorization URL were produced by
// `openid-client` (`generators.codeVerifier/state/codeChallenge` +
// `client.authorizationUrl`).
//
// After: PKCE/state come from `oauth.generateRandomCodeVerifier` /
// `oauth.calculatePKCECodeChallenge` / `oauth.generateRandomState`, and the
// authorization URL is assembled manually from the discovered
// `authorization_endpoint` — exactly as `@solid/reactive-authentication`'s
// `DPoPTokenProvider.upgrade()` does. The PKCE `codeVerifier` is still persisted
// via the base class `setupRedirectHandler` and consumed after redirect by
// `AuthCodeRedirectHandler`.
// ---------------------------------------------------------------------------
import type {
  IOidcHandler,
  IOidcOptions,
  LoginResult,
} from "@inrupt/solid-client-authn-core";
import {
  AuthorizationCodeWithPkceOidcHandlerBase,
  EVENTS,
} from "@inrupt/solid-client-authn-core";
import * as oauth from "oauth4webapi";

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
    const issuerConfig = oidcLoginOptions.issuerConfiguration;
    if (issuerConfig.authorizationEndpoint === undefined) {
      throw new Error(
        `The issuer [${oidcLoginOptions.issuer}] does not have an authorization endpoint.`,
      );
    }
    const codeVerifier = oauth.generateRandomCodeVerifier();
    const state = oauth.generateRandomState();
    const codeChallenge = await oauth.calculatePKCECodeChallenge(codeVerifier);

    // Build the authorization request URL manually from the discovered
    // authorization endpoint (oauth4webapi is stateless and has no
    // `authorizationUrl` helper). Mirrors the legacy openid-client parameters.
    const target = new URL(issuerConfig.authorizationEndpoint);
    target.searchParams.set("code_challenge", codeChallenge);
    target.searchParams.set("state", state);
    target.searchParams.set("response_type", "code");
    target.searchParams.set("redirect_uri", oidcLoginOptions.redirectUrl);
    target.searchParams.set("code_challenge_method", "S256");
    target.searchParams.set("prompt", "consent");
    target.searchParams.set("scope", oidcLoginOptions.scopes.join(" "));
    target.searchParams.set("client_id", oidcLoginOptions.client.clientId);
    const targetUrl = target.toString();

    if (oidcLoginOptions.eventEmitter) {
      oidcLoginOptions.eventEmitter.emit(EVENTS.AUTHORIZATION_REQUEST, {
        codeVerifier,
        state,
        issuer: oidcLoginOptions.issuer,
        redirectUrl: oidcLoginOptions.redirectUrl,
        dpopBound: oidcLoginOptions.dpop,
        clientId: oidcLoginOptions.client.clientId,
      });
    }

    return this.setupRedirectHandler({
      oidcLoginOptions,
      state,
      codeVerifier,
      targetUrl,
    });
  }
}
