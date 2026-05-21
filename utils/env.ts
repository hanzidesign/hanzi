// for local
const env = {
  isProd: process.env.NODE_ENV === 'production',
  isDev: process.env.NODE_ENV === 'development',
}

// for browser by prefixing with NEXT_PUBLIC_
const publicEnv = {
  isProd: process.env.NEXT_PUBLIC_NODE_ENV === 'production',
  isDev: process.env.NEXT_PUBLIC_NODE_ENV === 'development',
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Hanzi Studio',
  defaultColorScheme: process.env.NEXT_PUBLIC_COLOR_SCHEME || 'light',
  webUrl: getUrl(process.env.NEXT_PUBLIC_WEB_URL),
}

export { env, publicEnv }

function getUrl(url = 'http://localhost:3000') {
  const hasSlash = url.slice(-1) === '/'
  return hasSlash ? url.slice(0, -1) : url
}
