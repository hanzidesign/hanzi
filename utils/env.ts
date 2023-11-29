import _ from 'lodash'

// for local
const env = {
  timezone: process.env.TIMEZONE,
  isProd: process.env.NODE_ENV === 'production',
  isDev: process.env.NODE_ENV === 'development',
}

// for browser by prefixing with NEXT_PUBLIC_
const publicEnv = {
  isProd: process.env.NEXT_PUBLIC_NODE_ENV === 'production',
  isDev: process.env.NEXT_PUBLIC_NODE_ENV === 'development',
  appName: process.env.NEXT_PUBLIC_APP_NAME,
  defaultColorScheme: process.env.NEXT_PUBLIC_COLOR_SCHEME,
  webUrl: getUrl(process.env.NEXT_PUBLIC_WEB_URL),
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID),
  // api key
  apiKeyOpti: process.env.NEXT_PUBLIC_ALCHEMY_KEY_OPTIMISM,
  apiKeyGoerli: process.env.ALCHEMY_KEY_GOERLI,
}

export { env, publicEnv }

function toBool(value: any) {
  if (_.isNil(value)) {
    return undefined
  }

  if (value === true || Number(value) >= 1 || _.lowerCase(value) === 'true') {
    return true
  }

  return false
}

function getUrl(url: string) {
  if (!url) throw new Error('invalid NEXT_PUBLIC_API_BASE_URL')
  const hasSlash = url.slice(-1) === '/'
  return hasSlash ? url.slice(0, -1) : url
}
