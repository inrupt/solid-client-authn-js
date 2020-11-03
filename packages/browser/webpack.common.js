const path = require("path");

module.exports = {
  entry: "./src/index.browser.ts",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: "ts-loader",
            options: {
              configFile: "tsconfig.json",
            },
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    fallback: {
      crypto: require.resolve("crypto-browserify"),
      stream: require.resolve("stream-browserify"),
      util: require.resolve("util/"),
    },
  },
  output: {
    filename: "solid-client-authn.bundle.js",
    path: path.resolve(__dirname, "browserDist"),
    libraryTarget: "commonjs",
  },
};
