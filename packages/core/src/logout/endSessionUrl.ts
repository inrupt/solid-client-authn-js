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
import type { IRpLogoutOptions } from "./ILogoutHandler";

export interface IEndSessionOptions {
  endSessionEndpoint: string;
  idTokenHint?: string;
  postLogoutRedirectUri?: string;
  state?: string;
}

/**
 * This function is designed to isomorphically capture the behavior in oidc-client-js and node-oidc-provider
 * - https://github.com/IdentityModel/oidc-client-js/blob/edec8f59897bdeedcb0b4167586d49626203c2c1/src/OidcClient.js#L138
 * - https://github.com/panva/node-openid-client/blob/35758419489ff751a71f5b66f5020087a63e1e88/lib/client.js#L284
 *
 * @param options IEndSessionOptions
 * @returns The URL to redirect to in order to perform RP Initiated Logout
 * @hidden
 */
export function getEndSessionUrl({
  endSessionEndpoint,
  idTokenHint,
  postLogoutRedirectUri,
  state,
}: IEndSessionOptions) {
  const url = new URL(endSessionEndpoint);

  if (idTokenHint !== undefined)
    url.searchParams.append("id_token_hint", idTokenHint);

  if (postLogoutRedirectUri !== undefined) {
    url.searchParams.append("post_logout_redirect_uri", postLogoutRedirectUri);
    if (state !== undefined) url.searchParams.append("state", state);
  }

  return url.toString();
}

/**
 * @param options.endSessionEndpoint The end_session_endpoint advertised by the server
 * @param options.idTokenHint The idToken supplied by the server after logging in
 * Redirects the window to the location required to perform RP initiated logout
 *
 * @hidden
 */
export function maybeBuildRpInitiatedLogout({
  endSessionEndpoint,
  idTokenHint,
}: Partial<Omit<IEndSessionOptions, keyof IRpLogoutOptions>>) {
  if (endSessionEndpoint === undefined) return undefined;

  return function logout({ state, postLogoutUrl }: IRpLogoutOptions) {
    return getEndSessionUrl({
      endSessionEndpoint,
      idTokenHint,
      state,
      postLogoutRedirectUri: postLogoutUrl,
    });
  };
}
