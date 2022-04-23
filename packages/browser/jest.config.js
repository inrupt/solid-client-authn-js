module.exports = {
  ...require("../../jest.config"),
  // Allows running tests from packages/browser/
  // testEnvironment: "<rootDir>/../../tests/environment/customEnvironment.js",
  testEnvironment: "<rootDir>/../../tests/environment/browserEnvironment.js",

  // Enable injectGlobals here to support jest-mock-console
  // https://github.com/bpedersen/jest-mock-console/issues/32
  injectGlobals: true,
};
