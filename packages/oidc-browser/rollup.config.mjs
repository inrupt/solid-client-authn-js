// The following is only possible from Node 18 onwards
// import pkg from "./package.json" assert { type: "json" };

// Until we only support Node 18+, this should be used instead
// (see https://rollupjs.org/guide/en/#importing-packagejson) 
import { createRequire } from 'node:module';
import { createSharedConfig } from '@inrupt/base-rollup-config';
const require = createRequire(import.meta.url);
const pkg = require('./package.json');

export default {
  input: "./src/index.ts",
  output: [
    {
      file: pkg.main,
      format: "cjs",
    },
    {
      file: pkg.module,
      format: "esm",
    },
    {
      dir: "umd",
      format: "umd",
      name: "OidcDpopClient",
    },
  ],
  ...createSharedConfig(pkg)
};
