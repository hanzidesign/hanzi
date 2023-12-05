import d3ToPng from 'd3-svg-to-png'
import { Constants } from '@/types'

export const toDataURI = async (name: string, format = 'webp') => {
  const dataURI = await d3ToPng(`#${Constants.svgId}`, name, {
    scale: 1,
    format,
    download: false,
  })
  return dataURI
}
