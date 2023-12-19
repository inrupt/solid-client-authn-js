//
// Copyright Inrupt Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
// Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";
import createConfig, { createSharedConfig } from "@inrupt/base-rollup-config";
// eslint-disable-next-line import/extensions
import pkg from "./package.json" assert { type: "json" };

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
        preferBuiltins: false,
      }),
      // Adds support for importing cjs libraries such as the 'events' library
      commonjs(),
      // Minifies the browser bundle
      terser(),
    ],
  },
];
