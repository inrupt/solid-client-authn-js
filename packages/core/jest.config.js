module.exports = {
  ...require("../../jest.config"),
  // Allows running tests from packages/core/
  setupFilesAfterEnv: ['<rootDir>/../../jest.setup.ts'],
};
