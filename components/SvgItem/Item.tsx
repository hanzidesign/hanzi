export type SvgItemProps = {
  uid?: string
  fId: string // filter ID
  svgData: string
  ptnData: string
  width?: number
  distortion?: number
  blur?: number
  x?: number
  y?: number
  rotation?: number
  textColor?: string
  bgColor?: string
  bgData?: string
}

export default function SvgItem(props: SvgItemProps) {
  const { uid, fId, svgData, ptnData, bgData, x = 0, y = 0, rotation = 0 } = props
  const { width = 0, distortion = 0, blur = 0 } = props
  const { textColor = 'black', bgColor = 'white' } = props

  return (
    <svg id={uid} viewBox="0 0 1024 1024" preserveAspectRatio="xMidYMid meet" xmlnsXlink="http://www.w3.org/1999/xlink">
      <filter id={fId} x="0" y="0" width="100%" height="100%">
        {/* change text width */}
        <feMorphology
          operator={width > 0 ? 'dilate' : 'erode'}
          radius={Math.abs(width)}
          in="SourceGraphic"
          result="morphology"
        />
        {/* pattern */}
        <feImage href={ptnData} x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" />
        {/* desaturate the image */}
        <feColorMatrix type="saturate" values="0" result="IMAGE" />
        {/* decrease level of details so the effect on text is more realistic */}
        <feGaussianBlur in="IMAGE" stdDeviation={blur} result="MAP" />
        {/* use the displacement map to distort the text */}
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

      <mask maskUnits="userSpaceOnUse" id="mask" mask-type="alpha" dangerouslySetInnerHTML={{ __html: svgData }}></mask>

      <rect x="0" y="0" fill={bgColor} width="100%" height="100%" />

      {bgData ? <image href={bgData} x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" /> : null}

      <g filter={`url(#${fId})`}>
        <rect
          x="0"
          y="0"
          fill={textColor}
          width="100%"
          height="100%"
          mask="url(#mask)"
          transform={`translate(${x} ${y}) rotate(${rotation} 300 300)`}
        />
      </g>
    </svg>
  )
}
