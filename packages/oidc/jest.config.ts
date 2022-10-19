import baseConfig from "../../jest.config";
import { JestConfigWithTsJest } from "ts-jest";

export default {
  ...baseConfig,
  // This test environment is an extension of jsdom. This module targets the
  // browser environment only, so tests only need to run in jsdom.
  // Currently, this is still required despite the polyfills in jest setup.
  // See comments in file.
  testEnvironment: "<rootDir>/../../tests/environment/customEnvironment.ts",
  // Allows running tests from packages/oidc/
  setupFilesAfterEnv: ['<rootDir>/../../jest.setup.ts'],
} as JestConfigWithTsJest;