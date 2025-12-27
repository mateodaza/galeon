import nextConfig from '@galeon/eslint-config/next'
import nodeConfig from '@galeon/eslint-config/node'

/** @type {import('eslint').Linter.Config[]} */
export default [
  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      '**/artifacts/**',
      '**/cache/**',
      '**/typechain-types/**',
    ],
  },

  // Next.js app
  ...nextConfig.map((config) => ({
    ...config,
    files: ['apps/web/**/*.{ts,tsx,js,jsx}'],
  })),

  // Node.js apps and packages
  ...nodeConfig.map((config) => ({
    ...config,
    files: [
      'apps/api/**/*.{ts,js}',
      'apps/indexer/**/*.{ts,js}',
      'packages/stealth/**/*.{ts,js}',
      'packages/contracts/**/*.{ts,js}',
      'packages/eslint-config/**/*.js',
    ],
  })),
]
