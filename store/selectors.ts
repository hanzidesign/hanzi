import type { AppState } from './index'
import type { NftData } from 'types'

export const selectNftData = (state: AppState): NftData => {
  const { charUrl, svgData, ptnUrl, distortion, blur, width, x, y, rotation, textColor, bgColor } =
    state.editor
  return { charUrl, svgData, ptnUrl, distortion, blur, width, x, y, rotation, textColor, bgColor }
}
