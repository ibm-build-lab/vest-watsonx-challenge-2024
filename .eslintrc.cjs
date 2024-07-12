/** @type { import('eslint').Linter.Config }  */
module.exports = {
  plugins: ['@typescript-eslint', 'prettier', 'jest'],
  parserOptions: { ecmaVersion: 2020 },
  extends: [
    'prettier',
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        moduleDirectory: ['node_modules', 'src/']
      }
    }
  },
  ignorePatterns: ['node_modules', 'output', 'dist', 'out'],
  rules: {
    indent: ['error', 2],
    'no-console': 'off',
    'prettier/prettier': ['error', { endOfLine: 'auto' }],
    'one-var': [2, 'never'],
    'no-underscore-dangle': 'off',
    'import/no-extraneous-dependencies': ['off', { packageDir: [''] }],
    'import/extensions': 'off',
    'no-unused-vars': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        args: 'all',
        argsIgnorePattern: '^_',
        caughtErrors: 'all',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true
      }
    ]
  },
  env: {
    browser: true,
    es6: true,
    node: true,
    'jest/globals': true
  }
};
