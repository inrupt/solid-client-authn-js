// The following is only possible from Node 18 onwards
// import pkg from "./package.json" assert { type: "json" };

// Until we only support Node 18+, this should be used instead
// (see https://rollupjs.org/guide/en/#importing-packagejson)
import { createRequire } from "node:module";
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import createConfig, { createSharedConfig } from '@inrupt/base-rollup-config';

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
    ...createSharedConfig(pkg),
    external: [],
    plugins: [
      ...createSharedConfig(pkg).plugins,
      // Locate modules using the Node resolution algorithm, for using third party modules in node_modules
      // to bundle them into the browser build
      nodeResolve({
        // Use browser exports from dependencies where available
        browser: true,
        // Bundles in the events library from the node_modules
        // rather than trying to use the node events library
        preferBuiltins: false
      }),
      // Adds support for importing cjs libraries such as the 'events' library
      commonjs(),
      // Minifies the browser bundle
      terser(),
    ]
  },
];
