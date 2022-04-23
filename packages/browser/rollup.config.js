import pkg from "./package.json";
import typescript from "rollup-plugin-typescript2";
import nodeResolve from "@rollup/plugin-node-resolve";
import nodePolyfills from "rollup-plugin-polyfill-node";
import sourcemaps from "rollup-plugin-sourcemaps";

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
      file: pkg.bundle,
      format: "umd",
      name: "solidClientAuthentication",
      globals: {
        // FIXME: inline oidc-client:
        "@inrupt/oidc-client": "oidcClient",
        "@inrupt/solid-client-authn-core": "solidClientAuthnCore",
      },
    },
  ],
  plugins: [
    nodePolyfills({
      include: ["events"],
    }),
    sourcemaps(),
    nodeResolve({
      browser: true,
      preferBuiltins: true,
      resolveOnly: [
        "uuid",
        "@inrupt/solid-client-authn-core",
        "@inrupt/oidc-client-ext",
      ],
    }),
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
  external: ["@inrupt/solid-client", "@inrupt/solid-client-authn-core"],
  // external: ['crypto'],
  // The following option is useful because symlinks are used in monorepos
  preserveSymlinks: true,
};
