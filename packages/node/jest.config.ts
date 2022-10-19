import baseConfig from "../../jest.config";
import { JestConfigWithTsJest } from "ts-jest";

export default {
  ...baseConfig,
  testEnvironment: "node",
  // Allows running tests from packages/node/
  setupFilesAfterEnv: ['<rootDir>/../../jest.setup.ts'],
} as JestConfigWithTsJest;
