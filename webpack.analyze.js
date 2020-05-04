const BundleAnalyzerPlugin = require("webpack-bundle-analyzer")
  .BundleAnalyzerPlugin;
const webpackMerge = require("webpack-merge");

const productionConfig = require("./webpack.prod.js");

module.exports = () => {
  return webpackMerge(productionConfig, {
    plugins: [new BundleAnalyzerPlugin()]
  });
};
