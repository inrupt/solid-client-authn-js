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

import type { SessionTokenSet } from "@inrupt/solid-client-authn-core";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { Session, issuerConfigFetcher } from "./Session";

/**
 * Refresh the Access Token and ID Token using the Refresh Token.
 * The tokens may not be expired in order to be refreshed.
 *
 * @param tokenSet the tokens to refresh
 * @returns a new set of tokens
 * @since 2.4.0
 * @example
 * ```
 * const refreshedTokens = await refreshTokens(previousTokenSet);
 * const session = await Session.fromTokens(refreshedTokens, sessionId);
 * ```
 */
export async function refreshTokens(tokenSet: SessionTokenSet) {
  const session = await Session.fromTokens(tokenSet);
  // Replace with Promise.withResolvers when minimal node is 22.
  let tokenResolve: (tokens: SessionTokenSet) => void;
  let tokenReject: (reason?: Error) => void = () => {};
  const tokenPromise = new Promise<SessionTokenSet>((resolve, reject) => {
    tokenResolve = resolve;
    tokenReject = reject;
  });
  session.events.on("newTokens", (tokens) => {
    tokenResolve(tokens);
  });
  await session.login({
    oidcIssuer: tokenSet.issuer,
    clientId: tokenSet.clientId,
    refreshToken: tokenSet.refreshToken,
    tokenType: tokenSet.dpopKey === undefined ? "Bearer" : "DPoP",
  });
  if (!session.info.isLoggedIn) {
    tokenReject(new Error("Could not refresh the session."));
  }
  return tokenPromise;
}

/**
 * Performs an RP-initiated logout at the OpenID Provider associated to a user session using the provided token set.
 * After this has completed, the user will be logged out of their OpenID Provider. This terminates their current browsing
 * session on any active Solid application.
 *
 * @param tokenSet The set of tokens associated to the session being logged out. This must contain a valid ID token.
 * @param redirectHandler Function to redirect the user to the logout URL
 * @param postLogoutUrl An optional URL to be redirected to by the OpenID Provider after logout has been completed
 * @returns A Promise that resolves once the logout process is initiated
 * @since unreleased
 * @example
 * ```typescript
 * // Express.js logout endpoint
 * app.get("/logout", async (req, res) => {
 *   const tokenSet = ...;
 *   await logout(
 *     tokenSet,
 *     // Provide an express.js-specific redirect handler
 *     (url) => {
 *       res.redirect(url);
 *     }
 *   );
 * });
 * ```
 */
export async function logout(
  tokenSet: SessionTokenSet,
  redirectHandler: (url: string) => void,
  postLogoutUrl?: string,
): Promise<void> {
  const { idToken } = tokenSet;
  if (idToken === undefined) {
    throw new Error(
      "Logging out of the Identity Provider requires a valid ID token.",
    );
  }

  // Fetch the OpenID Provider configuration
  const opConfig = await issuerConfigFetcher.fetchConfig(tokenSet.issuer);

  // Verify that the ID token is valid before proceeding
  // TODO the JWK could be cached for efficiency.
  await jwtVerify(idToken, createRemoteJWKSet(new URL(opConfig.jwksUri)), {
    issuer: tokenSet.issuer,
  });

  // Check if the IdP supports RP-initiated logout
  if (!opConfig.endSessionEndpoint) {
    throw new Error(
      "The Identity Provider does not support RP-initiated logout.",
    );
  }

  // Construct the logout URL
  const logoutUrl = new URL(opConfig.endSessionEndpoint);

  // Add the ID token as a hint
  logoutUrl.searchParams.set("id_token_hint", idToken);

  // Add post-logout redirect URL if provided
  if (postLogoutUrl) {
    logoutUrl.searchParams.set("post_logout_redirect_uri", postLogoutUrl);
  }

  // Call the redirect handler with the constructed URL
  redirectHandler(logoutUrl.toString());
}
