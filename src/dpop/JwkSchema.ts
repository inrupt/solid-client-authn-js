/**
 * Proprietary and Confidential
 *
 * Copyright 2020 Inrupt Inc. - all rights reserved.
 *
 * Do not use without explicit permission from Inrupt Inc.
 */

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
