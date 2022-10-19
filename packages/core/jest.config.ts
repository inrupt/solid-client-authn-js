import baseConfig from "../../jest.config";
import { JestConfigWithTsJest } from "ts-jest";

export default {
  ...baseConfig,
  // Allows running tests from packages/core/
  setupFilesAfterEnv: ['<rootDir>/../../jest.setup.ts'],
} as JestConfigWithTsJest;
