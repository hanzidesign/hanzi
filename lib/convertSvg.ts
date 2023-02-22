import { join } from 'path'
import { convert } from 'convert-svg-to-png'

// api/run.js
import edgeChromium from 'chrome-aws-lambda'

// Importing Puppeteer core as default otherwise
// it won't function correctly with "launch()"
import puppeteer from 'puppeteer-core'

const LOCAL_CHROME_EXECUTABLE = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

export async function convertSvg(svg: string) {
  // Edge executable will return an empty string locally.
  const executablePath = (await edgeChromium.executablePath) || LOCAL_CHROME_EXECUTABLE

  const baseUrl = join(__dirname, '../public')
  const size = 1200

  const res = await convert(svg, {
    height: size,
    width: size,
    baseUrl,
    puppeteer: {
      executablePath,
      args: edgeChromium.args,
    },
  })

  const b64 = res.toString('base64')
  const mimeType = 'image/png'
  const dataURI = `data:${mimeType};base64,${b64}`
  return dataURI
}
