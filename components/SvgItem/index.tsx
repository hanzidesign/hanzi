import _ from 'lodash'
import { useEffect } from 'react'
import { renderToString } from 'react-dom/server'
import { useAppSelector } from 'store'
import Item from './Item'

type SvgItemProps = {
  toStr?: (compStr: string) => void
}

export default function SvgItem(props: SvgItemProps) {
  const { toStr } = props
  const editorState = useAppSelector((state) => state.editor)
  const { charUrl, ptnUrl, distortion, blur, width, x, y, rotation, textColor, bgColor } =
    editorState

  useEffect(() => {
    if (!toStr || _.includes(ptnUrl, '/images/patterns/')) return

    const str = renderToString(
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
    toStr(str)
  }, [toStr, editorState])

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
