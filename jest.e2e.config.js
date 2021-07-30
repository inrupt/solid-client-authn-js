module.exports = {
  roots: ["<rootDir>"],
  clearMocks: true,
  // Because we're making HTTP requests that can take a while,
  // tests should be given a little longer to complete. In particular
  // using the NSS IdP.
  testTimeout: 30000,
  testMatch: ["**/src/e2e/?(*.)+(spec|test).+(ts|tsx|js)"],
  transform: {
    "^.+\\.(ts|tsx)?$": "ts-jest",
  },
};
