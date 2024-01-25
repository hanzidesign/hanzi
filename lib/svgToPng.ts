'use client'

import axios from 'axios'
import { Constants } from '@/types'

export const svgToPng = async () => {
  const svg = document.getElementById(Constants.svgId)!.outerHTML
  const { data } = await axios.post<{ image: string }>('/api/svgToPng', { svg })
  return data.image
}
