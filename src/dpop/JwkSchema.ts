/**
 * Schema used to validate JSONWebKeys
 */
const jwkSchema = {
  $schema: "http://json-schema.org/draft-04/schema#",
  description: "json web key",
  type: "object",
  required: ["kty", "e", "n"],
  properties: {
    kty: {
      type: "string"
    },
    e: {
      type: "string"
    },
    n: {
      type: "string"
    }
  }
};

export default jwkSchema;
