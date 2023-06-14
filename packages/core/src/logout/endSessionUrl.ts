//
// Copyright 2022 Inrupt Inc.
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
export interface IEndSessionOptions {
  endSessionEndpoint: string;
  idTokenHint?: string;
  postLogoutRedirectUri?: string;
  state?: string;
}

// Designed to isomorphically capture the behavior in
// - https://github.com/IdentityModel/oidc-client-js/blob/edec8f59897bdeedcb0b4167586d49626203c2c1/src/OidcClient.js#L138
// - https://github.com/panva/node-openid-client/blob/35758419489ff751a71f5b66f5020087a63e1e88/lib/client.js#L284

// TODO: See if we need extraQueryParams like in
// https://github.com/IdentityModel/oidc-client-js/blob/edec8f59897bdeedcb0b4167586d49626203c2c1/src/SignoutRequest.js#L29-L31

// TODO: Validate end_session_endpoint according to https://openid.net/specs/openid-connect-rpinitiated-1_0.html#OPMetadata
export function getEndSessionUrl({
  endSessionEndpoint,
  idTokenHint,
  postLogoutRedirectUri,
  state,
}: IEndSessionOptions) {
  const url = new URL(endSessionEndpoint);

  if (idTokenHint) url.searchParams.append("id_token_hint", idTokenHint);

  if (postLogoutRedirectUri) {
    url.searchParams.append("post_logout_redirect_uri", postLogoutRedirectUri);
    if (state) url.searchParams.append("state", state);
  }

  return url.toString();
}
