import baseConfig from "../../jest.config";

export default {
  ...baseConfig,
  testEnvironment: "jsdom",
  // Allows running tests from packages/oidc/
  setupFilesAfterEnv: ['<rootDir>/../../jest.setup.ts'],
};