const isProd = process.env.NODE_ENV === 'production'
const compiler = isProd ? { removeConsole: true } : {}

/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler,
  webpack: (config, options) => {
    // svgr
    config.module.rules.map((rule) => {
      if (rule.test && rule.test.source && rule.test.source.includes('|svg|')) {
        rule.test = new RegExp(rule.test.source.replace('|svg|', '|'))
      }
    })
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: ['@svgr/webpack'],
    })

    // https://codesandbox.io/p/devbox/with-next-app-foktft?file=%2Fnext.config.js%3A5%2C5-6%2C64
    config.resolve.fallback = { fs: false, net: false, tls: false, child_process: false }
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    return config
  },
}

module.exports = nextConfig
