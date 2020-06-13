const path = require('path');

module.exports = {
  entry: './src/client/index.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'public'),
  },
  devtool: 'inline-source-map',
  /*
  devServer: {
    contentBase: path.join(__dirname, 'public'), //serve your static files from here
    watchContentBase: true,
    proxy: {
      '/src/server': 'http://localhost:3000'
    },
    port: 3000,
    compress: true,
    hot: true,
  },
  */
  mode: 'development',
};