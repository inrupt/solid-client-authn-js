// The following is only possible from Node 18 onwards
// import pkg from "./package.json" assert { type: "json" };

// Until we only support Node 18+, this should be used instead
// (see https://rollupjs.org/guide/en/#importing-packagejson)
import { createRequire } from "node:module";
import createConfig, { sharedConfig } from '../../rollup.common.mjs'
const require = createRequire(import.meta.url);
const pkg = require("./package.json");

const external = sharedConfig.external.filter(file => file !== "@inrupt/solid-client-authn-core");

export default [
  {
    ...createConfig(pkg)[0],
    external,
  },
  {
    input: "./src/mocks.ts",
    output: [
      {
        file: pkg.exports["./mocks"].require,
        format: "cjs",
      },
      {
        file: pkg.exports["./mocks"].import,
        format: "esm",
      },
    ],
    ...sharedConfig,
    external
  },
];
