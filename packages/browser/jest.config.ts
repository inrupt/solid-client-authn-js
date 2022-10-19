import baseConfig from "../../jest.config";
import { JestConfigWithTsJest } from "ts-jest";

export default {
  ...baseConfig,
  // Allows running tests from packages/browser/
  setupFilesAfterEnv: ['<rootDir>/../../jest.setup.ts'],
  // This test environment is an extension of jsdom. This module targets the
  // browser environment only, so tests only need to run in jsdom. 
  // Currently, this is still required despite the polyfills in jest setup.
  // See comments in file.
  testEnvironment: "<rootDir>/../../tests/environment/customEnvironment.ts",
  // Enable injectGlobals here to support jest-mock-console
  // https://github.com/bpedersen/jest-mock-console/issues/32
  injectGlobals: true,
} as JestConfigWithTsJest;
