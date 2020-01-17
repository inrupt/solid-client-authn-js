/**
 * An ajv schema defining the shape of an openid-configuration
 */

// TODO: there are many enums that are not filled out in this. They must be filled out
// TODO: REQUIRED elements are not specified

const issuerConfigSchema = {
  type: 'object',
  properties: {
    issuer: { type: 'string', format: 'uri' },
    authorization_endpoint: { type: 'string', format: 'uri' },
    token_endpoint: { type: 'string', format: 'uri' },
    userinfo_endpoint: { type: 'string', format: 'uri' },
    jwks_uri: { type: 'string', format: 'uri' },
    registration_endpoint: { type: 'string', format: 'uri' },
    scopes_supported: { type: 'array', items: { type: 'string' } },
    response_types_supported: {
      type: 'array',
      items: {
        type: 'string',
        joinedStringOf: ['code', 'id_token', 'token', 'none']
      }
    },
    response_modes_supported: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['query', 'fragment']
      },
      default: ['query', 'fragment']
    },
    grant_types_supported: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['authorization_code', 'implicit', 'client_credentials', 'device_code', 'refresh_token']
      },
      default: ['authorization_code', 'implicit']
    },
    acr_values_supported: { type: 'array', items: { type: 'string' } },
    subject_types_supported: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['pairwise', 'public']
      }
    },
    // TODO: fill out enum values
    id_token_signing_alg_values_supported: { type: 'array', items: { type: 'string' } },
    id_token_encryption_alg_values_supported: { type: 'array', items: { type: 'string' } },
    id_token_encryption_enc_values_supported: { type: 'array', items: { type: 'string' } },
    userinfo_signing_alg_values_supported: { type: 'array', items: { type: 'string' } },
    userinfo_encryption_alg_values_supported: { type: 'array', items: { type: 'string' } },
    userinfo_encryption_enc_values_supported: { type: 'array', items: { type: 'string' } },
    request_object_signing_alg_values_supported: { type: 'array', items: { type: 'string' } },
    request_object_encryption_alg_values_supported: { type: 'array', items: { type: 'string' } },
    request_object_encryption_enc_values_supported: { type: 'array', items: { type: 'string' } },
    token_endpoint_auth_methods_supported: { type: 'array', items: { type: 'string' } },
    token_endpoint_auth_signing_alg_values_supported: { type: 'array', items: { type: 'string' } },
    display_values_supported: { type: 'array', items: { type: 'string' } },
    claim_types_supported: { type: 'array', items: { type: 'string' } },
    claims_supported: { type: 'array', items: { type: 'string' } },
    service_documentation: { type: 'array', items: { type: 'string' } },
    claims_locales_supported: { type: 'array', items: { type: 'string' } },
    ui_locales_supported: { type: 'array', items: { type: 'string' } },
    claims_parameter_supported: { type: 'boolean' },
    request_parameter_supported: { type: 'boolean' },
    request_uri_parameter_supported: { type: 'boolean' },
    require_request_uri_registration: { type: 'boolean' },
    op_policy_uri: { type: 'string', format: 'uri' },
    op_tos_uri: { type: 'string', format: 'uri' }
  },
  additionalProperties: true
}

export default issuerConfigSchema
