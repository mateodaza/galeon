import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@galeon/stealth', '@galeon/pool', 'maci-crypto', 'poseidon-lite'],
  // Ensure maci-crypto only runs on client side
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Don't bundle maci-crypto on server - it uses browser-only BigInt features
      config.resolve.alias = {
        ...config.resolve.alias,
        'maci-crypto': false,
        'poseidon-lite': false,
      }
    }
    return config
  },
}

export default nextConfig
