module.exports = {
  roots: ["<rootDir>"],
  clearMocks: true,
  testMatch: ["**/(__tests__|src)/**/?(*.)+(spec|test).+(ts|tsx|js)"],
  transform: {
    "^.+\\.(ts|tsx)?$": "ts-jest",
  },
  modulePathIgnorePatterns: ["dist/"],
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
  ],
};
