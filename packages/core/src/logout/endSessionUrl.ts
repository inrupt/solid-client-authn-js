export interface EndSessionOptions {
  end_session_endpoint: string;
  id_token_hint?: string;
  post_logout_redirect_uri?: string;
  state?: string;
}

// Designed to isomorphically capture the behavior in
// - https://github.com/IdentityModel/oidc-client-js/blob/edec8f59897bdeedcb0b4167586d49626203c2c1/src/OidcClient.js#L138
// - https://github.com/panva/node-openid-client/blob/35758419489ff751a71f5b66f5020087a63e1e88/lib/client.js#L284

// TODO: See if we need extraQueryParams like in
// https://github.com/IdentityModel/oidc-client-js/blob/edec8f59897bdeedcb0b4167586d49626203c2c1/src/SignoutRequest.js#L29-L31

// TODO: Validate end_session_endpoint according to https://openid.net/specs/openid-connect-rpinitiated-1_0.html#OPMetadata
export function getEndSessionUrl({ end_session_endpoint, id_token_hint, post_logout_redirect_uri, state }: EndSessionOptions) {
  const url = new URL(end_session_endpoint);

  if (id_token_hint)
    url.searchParams.append('id_token_hint', id_token_hint);

  if (post_logout_redirect_uri) {
    url.searchParams.append('post_logout_redirect_uri', post_logout_redirect_uri);
    if (state)
      url.searchParams.append('state', state);
  }

  return url.toString();
}
