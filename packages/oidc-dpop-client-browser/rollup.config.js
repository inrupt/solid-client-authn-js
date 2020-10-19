import pkg from "./package.json";
import typescript from "rollup-plugin-typescript2";

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
  ],
  // external: ['crypto'],
  // The following option is useful because symlinks are used in monorepos
  preserveSymlinks: true
};
