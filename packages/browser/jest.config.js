module.exports = {
  ...require("../../jest.config"),
  // Allows running tests from packages/browser/
  setupFilesAfterEnv: ['<rootDir>/../../jest.setup.js'],
  testEnvironment: "jsdom",
  // Enable injectGlobals here to support jest-mock-console
  // https://github.com/bpedersen/jest-mock-console/issues/32
  injectGlobals: true,
};
