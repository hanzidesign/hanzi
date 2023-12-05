export type SvgItemProps = {
  uid?: string
  fId: string // filter ID
  svgData: string
  ptnUrl: string
  width?: number
  distortion?: number
  blur?: number
  x?: number
  y?: number
  rotation?: number
  textColor?: string
  bgColor?: string
}

export default function SvgItem(props: SvgItemProps) {
  const { uid, fId, svgData, ptnUrl, x = 0, y = 0, rotation = 0 } = props
  const { width = 0, distortion = 0, blur = 0 } = props
  const { textColor = 'black', bgColor = 'white' } = props

  return (
    <svg id={uid} viewBox="0 0 1024 1024" preserveAspectRatio="xMidYMid meet">
      <filter id={fId} x="0" y="0" width="100%" height="100%">
        {/* change text width */}
        <feMorphology
          operator={width > 0 ? 'dilate' : 'erode'}
          radius={Math.abs(width)}
          in="SourceGraphic"
          result="morphology"
        />
        {/* pattern */}
        <feImage xlinkHref={ptnUrl} x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" />
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
        {/* add the image as a background behind the text again */}
        {/* <feImage
          xlinkHref={img}
          x="0"
          y="0"
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          result="BG"
        /> */}
        <feColorMatrix
          in="TEXTURED_TEXT"
          result="TEXTURED_TEXT_2"
          type="matrix"
          values="1 0 0 0 0 
				  0 1 0 0 0 
				  0 0 1 0 0 
				  0 0 0 .9 0"
        />
        {/* blend the text with the background image */}
        {/* <feBlend
          in="BG"
          in2="TEXTURED_TEXT_2"
          mode="multiply"
          result="BLENDED_TEXT"
        /> */}
        {/* layer the text on top of the background image */}
        {/* <feMerge>
          <feMergeNode in="BG"></feMergeNode>
          <feMergeNode in="BLENDED_TEXT"></feMergeNode>
        </feMerge> */}
      </filter>

      <mask maskUnits="userSpaceOnUse" id="mask" mask-type="alpha" dangerouslySetInnerHTML={{ __html: svgData }}></mask>

      <rect x="0" y="0" fill={bgColor} width="100%" height="100%" />
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
