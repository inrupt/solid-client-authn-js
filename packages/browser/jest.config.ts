import baseConfig from "../../jest.config";
import { JestConfigWithTsJest } from "ts-jest";

export default {
  ...baseConfig,
  // Allows running tests from packages/browser/
  setupFilesAfterEnv: ['<rootDir>/../../jest.setup.ts'],
  // Currently, this is still required despite the polyfills in jest setup.
  // See comments in file.
  testEnvironment: "<rootDir>/../../tests/environment/customEnvironment.ts",
  // Enable injectGlobals here to support jest-mock-console
  // https://github.com/bpedersen/jest-mock-console/issues/32
  injectGlobals: true,
} as JestConfigWithTsJest;
