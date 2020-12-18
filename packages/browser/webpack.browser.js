const { merge } = require("webpack-merge");
const path = require("path");

const commonConfig = require("./webpack.common.js");

module.exports = () => {
  const envConfig = require(`./webpack.prod.js`);

  const browserConfig = {
    output: {
      libraryTarget: "var",
      library: "solidClientAuthentication",
      filename: "solid-client-authn.bundle.js",
      path: path.resolve(__dirname, "dist"),
    },
  };

  return merge(commonConfig, envConfig, browserConfig);
};
