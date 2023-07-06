// The following is only possible from Node 18 onwards
// import pkg from "./package.json" assert { type: "json" };

// Until we only support Node 18+, this should be used instead
// (see https://rollupjs.org/guide/en/#importing-packagejson)
import { createRequire } from "node:module";
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import createConfig, { sharedConfig } from '../../rollup.common.mjs';

const require = createRequire(import.meta.url);
const pkg = require("./package.json");

export default [
  ...createConfig(pkg),
  {
    input: "./src/index.ts",
    output: [
      {
        file: pkg.bundle,
        format: "iife",
        name: "solidClientAuthentication",
        sourcemap: true,
      },
    ],
    ...sharedConfig,
    external: [],
    plugins: [
      ...sharedConfig.plugins,
      nodeResolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      terser(),
    ]
  },
];
