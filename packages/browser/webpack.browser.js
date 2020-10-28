const { merge } = require("webpack-merge");

const commonConfig = require("./webpack.common.js");

module.exports = () => {
  const envConfig = require(`./webpack.prod.js`);

  const browserConfig = {
    output: {
      libraryTarget: "var",
      library: "solidClientAuthentication",
    },
  };

  return merge(commonConfig, envConfig, browserConfig);
};
