import type { NextConfig } from 'next'

const isProd = process.env.NODE_ENV === 'production'

const nextConfig: NextConfig = {
  compiler: isProd ? { removeConsole: true } : undefined,
  turbopack: {
    rules: {
      '*.glsl': {
        type: 'raw',
      },
    },
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.glsl$/i,
      type: 'asset/source',
    })

    return config
  },
}

export default nextConfig
