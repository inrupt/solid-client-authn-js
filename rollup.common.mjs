import typescript from "rollup-plugin-typescript2";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

export const createSharedConfig = pkg => ({
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
  external: Object.keys(pkg.dependencies),
  // The following option is useful because symlinks are used in monorepos
  preserveSymlinks: true,
});

export default pkg => [
  {
    input: "./src/index.ts",
    output: [
      {
        file: pkg.module,
        format: "esm",
        sourcemap: true,
      },
      {
        file: pkg.main,
        format: "cjs",
        sourcemap: true,
      },
    ],
    ...createSharedConfig(pkg),
  },
];
