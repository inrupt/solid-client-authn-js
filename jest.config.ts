import { JestConfigWithTsJest } from "ts-jest";

export default {
  roots: ["<rootDir>"],
  clearMocks: true,
  testMatch: ["**/(__tests__|src)/**/?(*.)+(spec|test).+(ts|tsx|js)"],
  // This combination of preset/transformIgnorePatterns enforces that both TS and
  // JS files are transformed to CJS, and that the transform also applies to the
  // dependencies in the node_modules, so that ESM-only dependencies are supported.
  preset: "ts-jest/presets/js-with-ts",
  transformIgnorePatterns: [],
  modulePathIgnorePatterns: ["dist/", "<rootDir>/examples/"],
  testPathIgnorePatterns: [
    "/node_modules/",
    // By default we only run unit tests:
    "e2e/*",
  ],
  reporters: ["default"],
  collectCoverage: true,
  coverageReporters: process.env.CI ? ["text", "lcov"] : ["text"],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  collectCoverageFrom: [
    "**/src/**/*.ts",
    "!**/node_modules/**",
    "!**/__tests__/**",
    "!**/src/external-types/**",
    "!**/src/index.ts",
    "!**/dist/**",
    "!**/*.spec.ts",
    "!**/examples/**",
  ],
  injectGlobals: false,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
} as JestConfigWithTsJest ;
