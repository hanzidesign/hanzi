'use client'

import d3ToPng from 'd3-svg-to-png'
import { Constants } from '@/types'

export const toDataURI = async (name: string) => {
  const dataURI = await d3ToPng(`#${Constants.svgId}`, name, {
    scale: 1,
    format: 'webp',
    download: false,
  })
  return dataURI
}
