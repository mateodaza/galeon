import nodeConfig from '@galeon/eslint-config/node'

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...nodeConfig,
  {
    // Ignore Solidity files and generated types
    ignores: ['**/*.sol', 'typechain-types/**', 'artifacts/**', 'cache/**'],
  },
]
