import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@galeon/stealth', '@galeon/pool'],
}

export default nextConfig
