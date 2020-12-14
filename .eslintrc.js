module.exports = {
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "prettier", "license-header"],
  extends: [
    "plugin:@typescript-eslint/recommended",
    "prettier/@typescript-eslint",
    "plugin:prettier/recommended",
    "@inrupt/eslint-config-lib",
  ],
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
    tsconfigRootDir: ".",
  },
  overrides: [
    {
      files: ["**/__mocks__/**"],
    },
  ],
  rules: {
    // The DI framework uses empty constructors to inject dependencies
    "no-useless-constructor": "off",
    "prettier/prettier": "error",
    "@typescript-eslint/naming-convention": [
      "error",
      {
        selector: "interface",
        format: ["PascalCase"],
        custom: {
          regex: "^I[A-Z]",
          match: true,
        },
      },
    ],
    "license-header/header": ["error", "./resources/license-header.js"],
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    // The following rules are disabled until the overall testing strategy is improved
    "jest/no-mocks-import": "off",
    "import/prefer-default-export": "off",
    // The following rule should be re-enabled after a refactoring of the handler pattern
    "class-methods-use-this": "off",
    // The following rule prevents issues with jose@3.x
    "import/no-unresolved": "off",
    // Each usage of @ts-ignore is documented. This rule only leads to
    // add an additional comment on top of each TS command.
    "@typescript-eslint/ban-ts-comment": "off",
  },
};
