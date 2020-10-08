import pkg from "./package.json";
import typescript from "rollup-plugin-typescript2";
import resolve from "@rollup/plugin-node-resolve";
import builtins from 'rollup-plugin-node-builtins';
import commonjs from "@rollup/plugin-commonjs";
import polyfills from 'rollup-plugin-node-polyfills';

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
  plugins: [
    typescript({
      // Use our own version of TypeScript, rather than the one bundled with the plugin:
      typescript: require("typescript"),
      tsconfigOverride: {
        compilerOptions: {
          module: "esnext",
        },
      },
    }),
    resolve(),
    commonjs(),
    polyfills(),
    builtins({crypto: false})
  ],
  external: ['crypto'],
  // The following option is useful because symlinks are used in monorepos
  preserveSymlinks: true
};
