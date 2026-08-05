const path = require('path');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const nodeModulesPaths = [
  path.resolve(__dirname, '../../node_modules'),
  path.resolve(__dirname, 'node_modules'),
];

module.exports = {
  mode: 'development',
  entry: ['./src/app.js'],
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'bundle.js',
  },
  devtool: 'cheap-module-source-map',
  module: {
    rules: [
      {
        test: /\.scss$/,
        include: path.resolve(__dirname, 'src/styles'),
        use: [
          { loader: MiniCssExtractPlugin.loader, options: { publicPath: './' } },
          'css-loader',
          {
            loader: 'sass-loader',
            options: { sourceMap: true, sassOptions: { includePaths: nodeModulesPaths } },
          },
        ],
      },
      {
        test: /\.js$/,
        include: path.resolve(__dirname, 'src'),
        use: 'babel-loader',
      },
      {
        test: /\.svg$/,
        include: path.resolve(__dirname, 'src/svg'),
        use: 'svg-inline-loader',
      },
      {
        test: /\.(ttf|woff|woff2)$/,
        type: 'asset/inline',
      },
    ],
  },
  devServer: {
    // webpack-dev-server 5 syntax (replaces the removed contentBase).
    static: { directory: path.join(__dirname, 'build') },
    compress: true,
    port: 9000,
    server: 'https', // Web MIDI requires a secure context
  },
  plugins: [
    new MiniCssExtractPlugin({ filename: 'style.css', chunkFilename: '[name].css' }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'index.html'),
      filename: 'index.html',
      inject: true,
    }),
    new webpack.ProvidePlugin({ $: 'jquery', jQuery: 'jquery' }),
    new CopyWebpackPlugin({
      patterns: [
        { from: path.resolve(__dirname, 'icons/favicon.ico'), to: path.resolve(__dirname, 'build/icons') },
        { from: path.resolve(__dirname, 'icons/favicon-16x16.png'), to: path.resolve(__dirname, 'build/icons') },
        { from: path.resolve(__dirname, 'icons/favicon-32x32.png'), to: path.resolve(__dirname, 'build/icons') },
        { from: path.resolve(__dirname, 'icons/apple-touch-icon.png'), to: path.resolve(__dirname, 'build/icons') },
        { from: path.resolve(__dirname, 'icons/manifest.json'), to: path.resolve(__dirname, 'build') },
        { from: path.resolve(__dirname, 'icons/safari-pinned-tab.svg'), to: path.resolve(__dirname, 'build/icons') },
        { from: path.resolve(__dirname, 'src/styles/fonts/Lato-Light.ttf'), to: path.resolve(__dirname, 'build/fonts') },
        { from: path.resolve(__dirname, '../../firmware'), to: path.resolve(__dirname, 'build/firmware') },
      ],
    }),
  ],
};
