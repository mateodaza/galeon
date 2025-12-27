import nodeConfig from '@galeon/eslint-config/node'

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...nodeConfig,
  {
    // Ignore Solidity files and generated types
    ignores: ['**/*.sol', 'typechain-types/**', 'artifacts/**', 'cache/**'],
  },
  {
    // Allow chai expect() expressions in test files
    files: ['test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
]
