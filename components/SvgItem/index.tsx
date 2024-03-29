'use client'

import { useAppSelector } from '@/store'
import { useAppContext } from '@/hooks/useAppContext'
import Item from './Item'

export default function SvgItem(props: { uid?: string }) {
  const { getActiveBg } = useAppContext()
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
      bgData={getActiveBg()}
    />
  )
}
