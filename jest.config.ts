import { JestConfigWithTsJest } from "ts-jest";

const baseConfig: JestConfigWithTsJest = {
  roots: ["<rootDir>"],
  clearMocks: true,
  testMatch: ["**/(__tests__|src)/**/?(*.)+(spec|test).+(ts|tsx|js)"],
  // This combination of preset/transformIgnorePatterns enforces that both TS and
  // JS files are transformed to CJS, and that the transform also applies to the
  // dependencies in the node_modules, so that ESM-only dependencies are supported.
  preset: "ts-jest/presets/js-with-ts",
  // deliberately set to an empty array to allow including node_modules when transforming code:
  transformIgnorePatterns: [],
  modulePathIgnorePatterns: ["dist/", "<rootDir>/examples/"],
  testPathIgnorePatterns: [
    "/dist/",
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
    "<rootDir>/src/**/*.ts",
  ],
  coveragePathIgnorePatterns: [
    "node_modules/",
    "dist/",
    ".*.spec.ts"
  ],
  injectGlobals: false,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
}

// Required by @peculiar/webcrypto, which comes from the polyfills
// loaded in the setup file.
process.env.OPENSSL_CONF = "/dev/null";

export default {
  projects: [{
    ...baseConfig,
    displayName: "core",
    roots: ["<rootDir>/packages/core"],
  }, {
    ...baseConfig,
    displayName: "oidc",
    roots: ["<rootDir>/packages/oidc-browser"],
    // This test environment is an extension of jsdom. This module targets the
    // browser environment only, so tests only need to run in jsdom.
    // Currently, this is still required despite the polyfills in jest setup.
    // See comments in file.
    testEnvironment: "<rootDir>/tests/environment/customEnvironment.ts",
  }, {
    ...baseConfig,
    displayName: "browser",
    roots: ["<rootDir>/packages/browser"],
    // This test environment is an extension of jsdom. This module targets the
    // browser environment only, so tests only need to run in jsdom.
    // Currently, this is still required despite the polyfills in jest setup.
    // See comments in file.
    testEnvironment: "<rootDir>/tests/environment/customEnvironment.ts",
    // Enable injectGlobals here to support jest-mock-console
    // https://github.com/bpedersen/jest-mock-console/issues/32
    injectGlobals: true,
  }, {
    ...baseConfig,
    displayName: "node",
    roots: ["<rootDir>/packages/node"],
    testEnvironment: "node",
  }],
} as JestConfigWithTsJest;
