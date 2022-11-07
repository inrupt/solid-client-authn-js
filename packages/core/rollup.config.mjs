// The following is only possible from Node 18 onwards
// import pkg from "./package.json" assert { type: "json" };

// Until we only support Node 18+, this should be used instead
// (see https://rollupjs.org/guide/en/#importing-packagejson) 
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pkg = require('./package.json');

import typescript from "rollup-plugin-typescript2";

const sharedConfig = {
  plugins: [
    typescript({
      // Use our own version of TypeScript, rather than the one bundled with the plugin:
      typescript: require("typescript"),
      tsconfigOverride: {
        compilerOptions: {
          module: "esnext",
        },
      },
    })
  ],
  // The following option is useful because symlinks are used in monorepos
  preserveSymlinks: true,
}

export default [{
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
  ],
  ...sharedConfig
}, {
  input: "./src/mocks.ts",
  output: [
    {
      file: pkg.exports['./mocks'].require,
      format: "cjs",
    },
    {
      file: pkg.exports['./mocks'].import,
      format: "esm",
    },
  ],
  ...sharedConfig
}];
