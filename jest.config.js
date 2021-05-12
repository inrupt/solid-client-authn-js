module.exports = {
  roots: ["<rootDir>"],
  clearMocks: true,
  testMatch: ["**/(__tests__|src)/**/?(*.)+(spec|test).+(ts|tsx|js)"],
  transform: {
    "^.+\\.(ts|tsx)?$": "ts-jest",
  },
  moduleNameMapper: {
    // Here, the OIDC package is used, but any package depending on jose@3.x would do.
    "^jose/(.*)$": "<rootDir>/node_modules/jose/dist/node/cjs/$1",
  },
  modulePathIgnorePatterns: ["dist/", "<rootDir>/example/"],
  testPathIgnorePatterns: [
    "/node_modules/",
    // By default we only run unit tests:
    "e2e/*",
  ],
  collectCoverageFrom: [
    "**/src/**/*.ts",
    "!**/node_modules/**",
    "!**/__tests__/**",
    "!**/src/external-types/**",
    "!**/src/index.ts",
    "!**/dist/**",
    "!**/*.spec.ts",
  ],
  testEnvironment: "<rootDir>/tests/environment/customEnvironment.js",
};
