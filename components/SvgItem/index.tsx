'use client'

import axios from 'axios'
import { useAppSelector } from '@/store'
import Item from './Item'

export default function SvgItem(props: { uid?: string }) {
  const editorState = useAppSelector((state) => state.editor)
  const { svgData, ptnData, distortion, blur, width, x, y, rotation, textColor, bgColor } = editorState

  return (
    <Item
      uid={props.uid}
      fId="f"
      svgData={svgData}
      ptnData={ptnData}
      distortion={distortion}
      blur={blur}
      width={width}
      x={x}
      y={y}
      rotation={rotation}
      textColor={textColor}
      bgColor={bgColor}
    />
  )
}
