import type { Config } from "jest";

export default {
  roots: ["<rootDir>"],
  clearMocks: true,
  // Increase timeout to accomodate variable network latency
  testTimeout: 30000,
  testMatch: ["<rootDir>/e2e/node/*.spec.ts"],
  transform: {
    "^.+\\.(ts|tsx)?$": "ts-jest",
  },
  testEnvironment: "node",
  setupFiles: ["<rootDir>/jest.e2e.setup.ts"]
} as Config;
