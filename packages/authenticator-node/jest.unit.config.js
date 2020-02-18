module.exports = {
  "roots": [
    "<rootDir>"
  ],
  "clearMocks": true,
  testMatch: [
    "**/__tests__/unit/**/*.+(ts|tsx|js)"
  ],
  "transform": {
    "^.+\\.(ts|tsx)?$": "ts-jest"
  },
}