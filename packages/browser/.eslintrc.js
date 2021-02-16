module.exports = {
  extends: ["../../.eslintrc.js"],
  rules: {
    // Only needed for a test that uses an 'enum' and that fails due to a
    // TS/ESLint bug: https://github.com/typescript-eslint/typescript-eslint/issues/2483
    // This is only for one test (TokenRequest.spec.ts), that is due to be
    // removed, at which point this workaround can be removed...
    "no-shadow": "off",
    "@typescript-eslint/no-shadow": "error",

    "license-header/header": ["error", "../../resources/license-header.js"],
  },
  parserOptions: {
    project: "./tsconfig.eslint.json",
  },
};
