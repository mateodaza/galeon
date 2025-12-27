import baseConfig from './base.js'
import nextPlugin from '@next/eslint-plugin-next'
import globals from 'globals'

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...baseConfig,

  // Browser globals for React
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        React: 'readonly',
      },
    },
  },

  // Next.js plugin
  {
    plugins: { '@next/next': nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },

  // React-specific rules
  {
    files: ['**/*.tsx'],
    rules: {
      // Allow non-null assertions in React components
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
]
