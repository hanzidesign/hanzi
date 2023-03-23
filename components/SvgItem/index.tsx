import _ from 'lodash'
import axios from 'axios'
import { useEffect } from 'react'
import { useAppSelector, useAppDispatch } from 'store'
import { setSvgData } from 'store/slices/editor'
import Item from './Item'

export default function SvgItem(props: { uid?: string }) {
  const dispatch = useAppDispatch()
  const editorState = useAppSelector((state) => state.editor)
  const { charUrl, svgData, ptnUrl, distortion, blur, width, x, y, rotation, textColor, bgColor } =
    editorState

  const getSvgData = async (charUrl: string) => {
    const data = await downloadSvgData(charUrl)
    dispatch(setSvgData(data))
  }

  useEffect(() => {
    getSvgData(charUrl)
  }, [charUrl])

  return (
    <Item
      uid={props.uid}
      fId="f"
      svgData={svgData}
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

async function downloadSvgData(url: string): Promise<string> {
  try {
    const res = await axios(url)
    return res.data.toString()
  } catch (error) {
    console.error(error)
    return `<image href="${url}" x="0" y="0" width="100%" height="100%" />`
  }
}
