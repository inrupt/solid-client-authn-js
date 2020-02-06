module.exports = {
  "roots": [
    "<rootDir>"
  ],
  testMatch: [
    "**/__tests__/**/?(*.)+(spec|test).+(ts|tsx|js)"
  ],
  "transform": {
    "^.+\\.(ts|tsx)?$": "ts-jest"
  },
  "collectCoverageFrom": [
    "**/src/**/*.ts",
    "!**/node_modules/**",
    "!**/__tests__/**"
  ]
}