/**
 * Schema used to validate JSONWebKeys
 */
const jwkSchema = {
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
