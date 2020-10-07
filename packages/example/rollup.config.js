import pkg from "./package.json";
import typescript from "rollup-plugin-typescript2";
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

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
      name: "ExampleTypeScript",
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
    nodeResolve(),
    commonjs(),
  ],
};
