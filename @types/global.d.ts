declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // private
      NODE_ENV: 'production' | 'development'

      // public
      NEXT_PUBLIC_NODE_ENV: 'production' | 'development'
      NEXT_PUBLIC_GOOGLE_ANALYTICS: string
      NEXT_PUBLIC_APP_NAME: string
      NEXT_PUBLIC_COLOR_SCHEME: 'dark' | 'light' | 'auto'
      NEXT_PUBLIC_WEB_URL: string
      // other
      NEXT_PUBLIC_GITHUB_URL: string
    }
  }
}

export {}
