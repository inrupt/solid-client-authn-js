module.exports = {
  extends: ["../../.eslintrc.js"],
  rules: {
    // Disable license checking within our sub-package, as we expect it to be
    // run from the mono-repo root instead (e.g. using 'lint-staged').
    "license-header/header": ["off"],
  },
};
