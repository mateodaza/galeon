import type { NextConfig } from 'next'
import path from 'path'

/**
 * Response headers on every route. The site may not be framed (clickjacking),
 * sends only its origin to other sites, and forbids MIME sniffing. A full
 * content security policy is not set yet: it has to be tested against the
 * wallet app's third-party scripts first.
 */
const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
]

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }]
  },
  transpilePackages: ['@galeon/stealth', '@galeon/pool', 'maci-crypto', 'poseidon-lite'],
  // The social-card renderer reads its fonts from disk at request time.
  outputFileTracingIncludes: {
    '/opengraph-image': ['./lib/og/fonts/**'],
    '/twitter-image': ['./lib/og/fonts/**'],
    '/about/opengraph-image': ['./lib/og/fonts/**'],
    '/about/twitter-image': ['./lib/og/fonts/**'],
    '/roadmap/opengraph-image': ['./lib/og/fonts/**'],
    '/roadmap/twitter-image': ['./lib/og/fonts/**'],
  },
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
