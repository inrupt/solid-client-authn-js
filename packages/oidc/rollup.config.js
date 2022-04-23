import pkg from "./package.json";
import rootPkg from "../../package.json";
// import nodePolyfills from "rollup-plugin-polyfill-node";
import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "rollup-plugin-typescript2";

const isProduction = process.env.NODE_ENV === "production";

const resolve = nodeResolve({
  browser: true,
  moduleDirectories: rootPkg.workspaces,
});

const commonOutput = {
  sourcemap: !isProduction,
};

export default {
  input: "./src/index.ts",
  output: [
    {
      file: pkg.main,
      format: "cjs",
      ...commonOutput,
    },
    {
      file: pkg.module,
      format: "esm",
      ...commonOutput,
    },
    {
      file: pkg.bundle,
      format: "umd",
      name: "OidcDpopClient",
      globals: {
        // FIXME: inline oidc-client:
        "@inrupt/oidc-client": "oidcClient",
        "@inrupt/solid-client-authn-core": "solidClientAuthnCore",
      },
      ...commonOutput,
    },
  ],
  plugins: [
    resolve,
    typescript({
      // Use our own version of TypeScript, rather than the one bundled with the plugin:
      typescript: require("typescript"),
      sourceMap: !isProduction,
      inlineSources: !isProduction,
      compilerOptions: {
        outDir: "./dist",
        declaration: true,
        declarationDir: ".",
        noEmit: false,
      },
    }),
  ],
  external: ["@inrupt/solid-client-authn-core", "@inrupt/oidc-client"],
};
