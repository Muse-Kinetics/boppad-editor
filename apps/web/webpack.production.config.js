const path = require('path');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

// Vendored SCSS (bootstrap-sass) now resolves from node_modules; the workspace
// hoists most deps to the repo-root node_modules.
const nodeModulesPaths = [
  path.resolve(__dirname, '../../node_modules'),
  path.resolve(__dirname, 'node_modules'),
];

module.exports = {
  mode: 'production',
  entry: ['./src/app.js'],
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'bundle.js',
  },
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
        // webpack 5 asset modules replace url-loader (inline as data URIs)
        test: /\.(ttf|woff|woff2)$/,
        type: 'asset/inline',
      },
    ],
  },
  optimization: {
    // webpack 5 built-in Terser, replacing the deprecated uglifyjs-webpack-plugin.
    // keep_fnames preserved to match previous behavior (code relies on fn names).
    minimizer: [
      new TerserPlugin({
        terserOptions: { keep_fnames: true, mangle: { keep_fnames: true } },
      }),
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({ filename: 'style.css', chunkFilename: '[name].css' }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'index.html'),
      filename: 'index.html',
      inject: true,
      minify: {
        collapseWhitespace: true,
        keepClosingSlash: true,
        removeComments: true,
        removeRedundantAttributes: false, // keep type="text"
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true,
      },
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
