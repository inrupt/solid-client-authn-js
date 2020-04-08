module.exports = {
  roots: ["<rootDir>"],
  clearMocks: true,
  testMatch: ["**/__tests__/**/?(*.)+(spec|test).+(ts|tsx|js)"],
  transform: {
    "^.+\\.(ts|tsx)?$": "ts-jest"
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!**/node_modules/**",
    "!**/__tests__/**",
    "!src/external-types/**",
    "!src/index.ts"
  ]
};
