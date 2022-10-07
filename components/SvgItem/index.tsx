import { useAppSelector } from 'store'
import Item from './Item'

export default function SvgItem() {
  const editorState = useAppSelector((state) => state.editor)
  const {
    charUrl,
    ptnUrl,
    distortion,
    blur,
    width,
    x,
    y,
    rotation,
    textColor,
    bgColor,
  } = editorState

  return (
    <Item
      fId="f"
      imgUrl={charUrl}
      ptnUrl={ptnUrl}
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
