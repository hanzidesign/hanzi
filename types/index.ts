export type StudioEditorState = {
  charUrl: string
  svgData: string
  ptnUrl: string
  ptnData: string
  distortion: number
  blur: number
  width: number
  x: number
  y: number
  rotation: number
  textColor: string
  bgColor: string
}

export enum Constants {
  svgViewId = 'SVG-EFFECT-VIEW',
}
