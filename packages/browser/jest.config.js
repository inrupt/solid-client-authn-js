module.exports = {
  ...require("../../jest.config"),
  // Allows running tests from packages/browser/
  testEnvironment: "<rootDir>/../../tests/environment/customEnvironment.js",
};
