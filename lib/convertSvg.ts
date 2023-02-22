import { join } from 'path'
import { convert } from 'convert-svg-to-png'

export async function convertSvg(svg: string) {
  const baseUrl = join(__dirname, '../public')
  const size = 1200
  const res = await convert(svg, { height: size, width: size, baseUrl })

  const b64 = res.toString('base64')
  const mimeType = 'image/png'
  const dataURI = `data:${mimeType};base64,${b64}`
  return dataURI
}
