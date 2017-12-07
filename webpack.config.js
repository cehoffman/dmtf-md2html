'use strict';
const {resolve} = require('path');
const webpack = require('webpack');
const ErrorNotificationPlugin = require('webpack-error-notification');
const HTMLWebpackPlugin = require('html-webpack-plugin');
// const {dependencies} = require('./package.json');
// const externals = Object.keys(dependencies || {});

const plugins = [
  new ErrorNotificationPlugin(),
  new HTMLWebpackPlugin({title: 'DMTF HTML Releaser'}),
  new webpack.NoErrorsPlugin(),
];

if (process.env.NODE_ENV === 'production') {
  plugins.push(
    new webpack.LoaderOptionsPlugin({
      minimize: true,
      debug: false,
    }),
    new webpack.optimize.UglifyJsPlugin({
      beautify: false,
      mangle: {
        screw_ie8: true,
      },
      compress: {
        screw_ie8: true,
      },
      comments: false,
      sourceMap: false,
    }),
    new webpack.optimize.DedupePlugin()
  );
}

module.exports = [
  {
    name: 'web',
    devtool: 'source-map',
    devServer: {
      port: 9000,
      host: 'localhost',
      historyAPIFallback: true,
      watchOptions: {
        agregateTimeout: 300,
        poll: 1000,
      },
    },
    resolve: {
      extensions: ['', '.js'],
      modules: [resolve('src'), resolve('node_modules')],
      packageMains: ['browser', 'main'],
    },
    entry: {
      app: ['./src'],
    },
    output: {
      path: resolve('dist'),
      filename: '[name].min.js',
      sourceMapFilename: '[name].min.map',
    },
    target: 'web',
    plugins,
    module: {
      preLoaders: [
        {
          loader: ['source-map', 'eslint'],
          test: /\.js$/,
          exclude: /node_modules/,
        },
      ],
      loaders: [
        {
          loader: 'babel',
          test: /\.js$/,
          exclude: /node_modules/,
          query: {
            presets: ['es2015-native-modules', 'stage-1'],
            plugins: [
              'transform-function-bind',
            ],
          },
        },
        {
          loader: [
            'style',
            'css?modules&sourceMap&importLoaders=1&localIdentName=[name]__[local]__[hash:base64:5]',
            'postcss'
          ],
          test: /\.css$/,
          // query: {
          //   importLoaders: 1,
          //   localIdentName: '[name]__[local]__[hash:base64:5]',
          //   modules: true,
          //   sourceMap: true,
          // },
        },
        {
          loader: 'url',
          test: /\.(svg|eot|woff|ttf|jpg)$/
        }
      ],
    },
    postcss: () => [
      require('stylelint')(),
      require('precss'),
      require('autoprefixer'),
    ],
    // externals: [
    //   'electron',
    // ],
  },
];
