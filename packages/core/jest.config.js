module.exports = {
  ...require("../../jest.config"),
  // Allows running tests from packages/core/
  testEnvironment: "<rootDir>/../../tests/environment/customEnvironment.js",
};
