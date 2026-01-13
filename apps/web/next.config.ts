import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  transpilePackages: ['@galeon/stealth', '@galeon/pool', 'maci-crypto', 'poseidon-lite'],
  // Ensure crypto libraries only run on client side
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Create empty stubs for browser-only crypto packages
      // These use BigInt features that don't work during SSR/build
      const emptyModule = path.resolve(__dirname, 'lib/empty-module.js')
      config.resolve.alias = {
        ...config.resolve.alias,
        'maci-crypto': emptyModule,
        'poseidon-lite': emptyModule,
        snarkjs: emptyModule,
        ffjavascript: emptyModule,
        '@galeon/pool': emptyModule,
      }
    }
    return config
  },
}

export default nextConfig
