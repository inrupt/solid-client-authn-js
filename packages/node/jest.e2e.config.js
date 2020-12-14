module.exports = {
  ...require("../../jest.e2e.config"),
  testEnvironment: "node",
  moduleNameMapper: {
    // Here, the OIDC package is used, but any package depending on jose@3.x would do.
    "^jose/(.*)$": "<rootDir>/node_modules/jose/dist/node/cjs/$1",
  },
};
