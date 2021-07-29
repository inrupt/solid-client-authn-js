module.exports = {
  ...require("../../jest.config"),
  // Allows running tests from packages/core/
  testEnvironment: "<rootDir>/../../tests/environment/customEnvironment.js",
  moduleNameMapper: {
    // Here, the OIDC package is used, but any package depending on jose@3.x would do.
    "^jose/(.*)$": "<rootDir>/node_modules/jose/dist/node/cjs/$1",
  },
};
