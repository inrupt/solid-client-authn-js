module.exports = {
  roots: ["<rootDir>"],
  clearMocks: true,
  testMatch: ["**/(__tests__|src)/**/?(*.)+(spec|test).+(ts|tsx|js)"],
  transform: {
    "^.+\\.(ts|tsx)?$": "ts-jest",
  },
  modulePathIgnorePatterns: ["dist/"],
  collectCoverageFrom: [
    "**/src/**/*.ts",
    "!**/node_modules/**",
    "!**/__tests__/**",
    "!**/src/external-types/**",
    "!**/src/index.ts",
    "!**/dist/**",
  ],
};
