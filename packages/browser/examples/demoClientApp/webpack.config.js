const HtmlWebPackPlugin = require("html-webpack-plugin");

module.exports = {
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },
      {
        test: /\.html$/,
        use: [
          {
            loader: "html-loader",
          },
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebPackPlugin({
      template: "./src/index.html",
      filename: "./index.html",
    }),
  ],
  output: {
    publicPath: process.env.ASSET_PATH || '/',
  },
  devServer: {
    // TODO: PMCB55: make demo's 'prettier' by avoiding 'localhost'...
    // public: "my-demo-app.com",
    // port: 80,
    port: 3001,
    historyApiFallback: true,
  },
};
