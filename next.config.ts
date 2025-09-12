import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Configure webpack for client-side builds only
    if (!isServer) {
      // Provide fallbacks for Node.js modules in browser environment
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        buffer: require.resolve('buffer'),
        util: require.resolve('util'),
        url: false,
        querystring: false,
        worker_threads: false,
        child_process: false,
        net: false,
        tls: false,
        os: false,
      }

      // Handle problematic external modules
      config.externals = {
        ...config.externals,
        'web-worker': 'self',
      }

      // Add buffer polyfill as a plugin
      const webpack = require('webpack')
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        })
      )
    }

    // Suppress webpack warnings about dynamic requires and critical dependencies
    config.module = {
      ...config.module,
      exprContextCritical: false,
      unknownContextCritical: false,
    }

    // Handle potential issues with ES modules
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
    }

    return config
  },

  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  // Configure transpilation for specific packages if needed
  transpilePackages: ['@zk-kit/baby-jubjub', 'maci-crypto', 'poseidon-lite'],
}

export default nextConfig
