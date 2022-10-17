module.exports = {
  ...require("../../jest.config"),
  testEnvironment: "jsdom",
  // Allows running tests from packages/oidc/
  setupFilesAfterEnv: ['<rootDir>/../../jest.setup.js'],
};
