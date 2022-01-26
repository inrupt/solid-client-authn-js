module.exports = {
  roots: ["<rootDir>"],
  clearMocks: true,
  // Increase timeout to accomodate variable network latency
  testTimeout: 30000,
  testMatch: ["**/e2e/?(*.)+(spec|test).+(ts|tsx|js)"],
  transform: {
    "^.+\\.(ts|tsx)?$": "ts-jest",
  },
  testEnvironment: "node",
};
