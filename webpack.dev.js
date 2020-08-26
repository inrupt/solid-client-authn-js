const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  mode: "development",
  devtool: "inline-source-map",
  devServer: {
    contentBase: path.join(__dirname, "browserDist"),
    port: 9000,
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: "Solid Authenticator Test Page",
      template: "./src/index.html",
    }),
  ],
};
