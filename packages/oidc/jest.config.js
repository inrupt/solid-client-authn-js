module.exports = {
  ...require("../../jest.config"),
  // Allows running tests from packages/oidc/
  testEnvironment: "<rootDir>/../../tests/environment/customEnvironment.js",
};
