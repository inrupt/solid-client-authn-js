/**
 * Function to retrieve the openid-configuration for the IDP
 */

export default function getOpenIdConfig(options: {
  issuer: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): Record<string, any> {
  /* eslint-disable @typescript-eslint/camelcase */
  return {
    issuer: options.issuer,
    authorization_endpoint: `${options.issuer}/authorize`,
    token_endpoint: `${options.issuer}/token`,
    userinfo_endpoint: `${options.issuer}/userinfo`,
    jwks_uri: `${options.issuer}/jwks`,
    registration_endpoint: `${options.issuer}/registration`,
    response_types_supported: [
      "code",
      "code token",
      "code id_token",
      "id_token",
      "id_token token",
      "code id_token token",
      "none"
    ],
    response_modes_supported: ["query", "fragment"],
    grant_types_supported: [
      "authorization_code",
      "implicit",
      "refresh_token",
      "client_credentials"
    ],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256", "RS384", "RS512", "none"],
    token_endpoint_auth_methods_supported: ["client_secret_basic"],
    token_endpoint_auth_signing_alg_values_supported: ["RS256"],
    display_values_supported: [],
    claim_types_supported: ["normal"],
    claims_supported: [],
    claims_parameter_supported: false,
    request_parameter_supported: true,
    request_uri_parameter_supported: false,
    require_request_uri_registration: false,
    check_session_iframe: `${options.issuer}/session`,
    end_session_endpoint: `${options.issuer}/logout`
  };
  /* eslint-enable @typescript-eslint/camelcase */
}
