const webpackMerge = require("webpack-merge");

const commonConfig = require("./webpack.common.js");

module.exports = ({ env, addon }) => {
  const envConfig = require(`./webpack.${env}.js`);
  return webpackMerge(commonConfig, envConfig);
};
