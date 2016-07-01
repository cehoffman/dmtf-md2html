'use strict';
const {resolve} = require('path');
const webpack = require('webpack');
const ErrorNotificationPlugin = require('webpack-error-notification');
const HTMLWebpackPlugin = require('html-webpack-plugin');
// const {dependencies} = require('./package.json');
// const externals = Object.keys(dependencies || {});

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
      modules: [resolve('src'), 'node_modules'],
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
    plugins: [
      new ErrorNotificationPlugin(),
      new HTMLWebpackPlugin({title: 'DMTF HTML Releaser'}),
      // new webpack.LoaderOptionsPlugin({
      //   minimize: true,
      //   debug: true,
      // }),
      // new webpack.optimize.UglifyJsPlugin({
      //   beautify: false,
      //   mangle: {
      //     screw_ie8: true,
      //     keep_fnames: true,
      //   },
      //   compress: {
      //     screw_ie8: true,
      //     keep_fnames: true,
      //   },
      //   comments: false,
      //   sourceMap: true,
      // }),
      // new webpack.optimize.DedupePlugin(),
      // new CompressionPlugin({
      //   regExp: /.js$/,
      // }),
      new webpack.NoErrorsPlugin(),
    ],
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
