const path = require('path');

module.exports = {
  entry: './src/index.browser.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: "tsconfig.browser.json"
            }
          }
        ],
        exclude: /node_modules/
      },
    ],
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ],
  },
  output: {
    filename: 'solid-authenticator.bundle.js',
    path: path.resolve(__dirname, 'browserDist'),
  }
};
