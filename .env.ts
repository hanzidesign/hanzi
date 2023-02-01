import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Variables overwriting/priority
// .env.production.local
// .env.development.local
// .env.local
// .env.production
// .env.development
// .env

config()

function config() {
  const envs = ['production', 'development', 'ex']
  const cwd = process.cwd()
  const files = [
    ...envs.map((env) => `.env.${env}.local`),
    '.env.local',
    ...envs.map((env) => `.env.${env}`),
    '.env',
  ]

  return files
    .map((fileName) => path.resolve(cwd, fileName))
    .filter((filePath) => fs.existsSync(filePath))
    .reduce((settings, path) => {
      const foundSettings = dotenv.config({ path })
      if (foundSettings.error) throw foundSettings.error
      return { ...foundSettings.parsed, ...settings }
    }, {})
}
