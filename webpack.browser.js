const webpackMerge = require("webpack-merge");

const commonConfig = require("./webpack.common.js");

module.exports = ({ env, addon }) => {
  const envConfig = require(`./webpack.${env}.js`);

  const browserConfig = {
    output: {
      libraryTarget: "var",
      library: "solidClientAuthn"
    }
  };

  return webpackMerge(commonConfig, envConfig, browserConfig);
};
