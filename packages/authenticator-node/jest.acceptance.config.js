module.exports = {
  "roots": [
    "<rootDir>"
  ],
  "clearMocks": true,
  testMatch: [
    "**/__tests__/acceptance/**/*.+(ts|tsx|js)"
  ],
  "transform": {
    "^.+\\.(ts|tsx)?$": "ts-jest"
  },
}