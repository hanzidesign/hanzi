import _ from 'lodash'
import axios from 'axios'
import { useState, useEffect } from 'react'
import { useAppSelector } from 'store'
import Item from './Item'

export default function SvgItem(props: { uid?: string }) {
  const editorState = useAppSelector((state) => state.editor)
  const { charUrl, ptnUrl, distortion, blur, width, x, y, rotation, textColor, bgColor } =
    editorState

  const [svgData, setSvgData] = useState(getDefaultSvgData(charUrl))

  const getSvgData = async (charUrl: string) => {
    const data = await downloadSvgData(charUrl)
    setSvgData(data)
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

function getDefaultSvgData(charUrl: string) {
  return `<image href="${charUrl}" x="0" y="0" width="100%" height="100%" />`
}

async function downloadSvgData(url: string): Promise<string> {
  if (!url) return getDefaultSvgData(url)

  try {
    const res = await axios(url)
    return res.data.toString()
  } catch (error) {
    console.error(error)
    return getDefaultSvgData(url)
  }
}
