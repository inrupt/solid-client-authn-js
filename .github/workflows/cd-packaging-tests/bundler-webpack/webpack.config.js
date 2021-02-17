// It should be possible to delete this file once solid-client-authn-browser has switched to jose@3:
module.exports = {
  resolve: {
    fallback: {
      crypto: require.resolve("crypto-browserify"),
      stream: require.resolve("stream-browserify"),
      util: require.resolve("util/"),
      buffer: require.resolve("buffer/"),
      os: require.resolve("os-browserify/browser"),
      assert: require.resolve("assert/"),
      zlib: require.resolve("browserify-zlib"),
    },
  },
};
