import baseConfig from "../../jest.config";

export default {
  ...baseConfig,
  testEnvironment: "node",
  // Allows running tests from packages/node/
  setupFilesAfterEnv: ['<rootDir>/../../jest.setup.ts'],
};
