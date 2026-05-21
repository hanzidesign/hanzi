'use client'

import { useId } from 'react'
import { useStudio } from '@/app/studio/studio-context'

export default function SvgEffectView() {
  const {
    state: { svgData, ptnData, distortion, blur, width, x, y, rotation, textColor, bgColor },
  } = useStudio()
  const id = useId()
  const filterId = `filter-${id}`
  const maskId = `mask-${id}`
  const pattern = ptnData || TRANSPARENT_PATTERN_DATA_URL

  return (
    <svg viewBox="0 0 1024 1024" preserveAspectRatio="xMidYMid meet" xmlnsXlink="http://www.w3.org/1999/xlink">
      <filter id={filterId} x="0" y="0" width="100%" height="100%">
        <feMorphology
          operator={width > 0 ? 'dilate' : 'erode'}
          radius={Math.abs(width)}
          in="SourceGraphic"
          result="morphology"
        />
        <feImage href={pattern} x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" />
        <feColorMatrix type="saturate" values="0" result="IMAGE" />
        <feGaussianBlur in="IMAGE" stdDeviation={blur} result="MAP" />
        <feDisplacementMap
          in="morphology"
          in2="MAP"
          scale={distortion}
          xChannelSelector="R"
          yChannelSelector="R"
          result="TEXTURED_TEXT"
        />
        <feColorMatrix
          in="TEXTURED_TEXT"
          result="TEXTURED_TEXT_2"
          type="matrix"
          values="1 0 0 0 0
            0 1 0 0 0
            0 0 1 0 0
            0 0 0 .9 0"
        />
      </filter>

      <mask maskUnits="userSpaceOnUse" id={maskId} mask-type="alpha" dangerouslySetInnerHTML={{ __html: svgData }} />

      <rect x="0" y="0" fill={bgColor} width="100%" height="100%" />

      <g filter={`url(#${filterId})`}>
        <rect
          x="0"
          y="0"
          fill={textColor}
          width="100%"
          height="100%"
          mask={`url(#${maskId})`}
          transform={`translate(${x} ${y}) rotate(${rotation} 300 300)`}
        />
      </g>
    </svg>
  )
}

const TRANSPARENT_PATTERN_DATA_URL = 'data:image/gif;base64,R0lGODlhAQABAAAAACw='
