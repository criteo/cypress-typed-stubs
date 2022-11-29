const webpackPreprocessor = require('@cypress/webpack-batteries-included-preprocessor');

const webpackOptions = webpackPreprocessor.defaultOptions.webpackOptions;

webpackOptions.module.rules.unshift({
  test: /[/\\]@angular[/\\].+\.m?js$/,
  resolve: {
    fullySpecified: false,
  },
  use: {
    loader: 'babel-loader',
    options: {
      plugins: ['@angular/compiler-cli/linker/babel'],
      compact: false,
      cacheDirectory: true,
    },
  },
});

module.exports = (on) => {
  on(
    'file:preprocessor',
    webpackPreprocessor({
      webpackOptions,
      typescript: require.resolve('typescript'),
    })
  );
};
