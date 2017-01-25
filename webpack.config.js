var webpack = require('webpack');
var path = require('path');

var BUILD_DIR = path.resolve(__dirname, 'src/client/public');
var APP_DIR = path.resolve(__dirname, 'src/client/app');

var config = {
  entry: {
      'root': APP_DIR + '/root.jsx',
      'forget': APP_DIR + '/forget.jsx',
      'signin': APP_DIR + '/signin.jsx',
      'signup': APP_DIR + '/signup.jsx',
      'invite': APP_DIR + '/invite.jsx',
      'terms': APP_DIR + '/terms.jsx',
      'privacy': APP_DIR + '/privacy.jsx',
      'cookies': APP_DIR + '/cookies.jsx',
      'p_base': APP_DIR + '/p_base.js',
      'home': ['babel-polyfill',APP_DIR + '/index.jsx'],
      'config': ['babel-polyfill', APP_DIR + '/config.jsx']
  },
  output: {
    path: BUILD_DIR,
    publicPath: '/static/',
    filename: '[name].js',
  },
  plugins: [],
  module : {
    loaders : [
      { test: /\.json$/, loader: 'json' },
      { test: /\.md$/, loader: 'file' },
      { test: /\.jsx?/, include : APP_DIR, loader : 'babel' },
      { test: /\.css$/, exclude: /\.useable\.css$/, loader: "style-loader!css-loader" },
      { test: /\.useable\.css$/, loader: "style-loader/useable!css-loader" },
      { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, loader: "file" },
      { test: /\.(woff|woff2)$/, loader:"url?prefix=font/&limit=5000" },
      { test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&mimetype=application/octet-stream" },
      { test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&mimetype=image/svg+xml" },
      { test: /\.png(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&mimetype=image/png" },
    ],
  },
};

module.exports = config;
