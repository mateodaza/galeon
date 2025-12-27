import baseConfig from './base.js'
import globals from 'globals'

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...baseConfig,

  // Node.js globals
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // Node-specific rules
  {
    rules: {
      // Allow console in backend
      'no-console': 'off',
    },
  },
]
