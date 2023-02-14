import { join } from 'path'
import { convert } from 'convert-svg-to-png'

async function convertSvg(svg: string) {
  const baseUrl = join(__dirname, '../public')
  const res = await convert(svg, { height: 600, width: 600, baseUrl })

  const b64 = res.toString('base64')
  const mimeType = 'image/png'
  const dataURI = `data:${mimeType};base64,${b64}`
  return dataURI
}

export default convertSvg
