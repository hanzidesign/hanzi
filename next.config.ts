import type { NextConfig } from 'next'
import path from 'node:path'

const isProd = process.env.NODE_ENV === 'production'
const glslSourceLoader = path.resolve('./loaders/glsl-source-loader.cjs')

const nextConfig: NextConfig = {
  compiler: isProd ? { removeConsole: true } : undefined,
  turbopack: {
    root: process.cwd(),
    rules: {
      '*.glsl': {
        loaders: [glslSourceLoader],
        as: '*.js',
      },
    },
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.glsl$/i,
      use: [glslSourceLoader],
    })

    return config
  },
}

export default nextConfig
