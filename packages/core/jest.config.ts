import baseConfig from "../../jest.config";

export default {
  ...baseConfig,
  // Allows running tests from packages/core/
  setupFilesAfterEnv: ['<rootDir>/../../jest.setup.ts'],
};
