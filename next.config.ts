import type { NextConfig } from 'next'

const isProd = process.env.NODE_ENV === 'production'

const nextConfig: NextConfig = {
  compiler: isProd ? { removeConsole: true } : undefined,
}

export default nextConfig
