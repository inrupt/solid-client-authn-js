/**
 * Schema used to validate JSONWebKeys
 */

// TODO: make an actual jwk schema
const jwkSchema = {
  type: "object",
  additionalProperties: true
};

export default jwkSchema;
