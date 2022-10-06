type SvgItemProps = {
  fId: string // filter ID
  imgUrl: string
  ptnUrl: string
  distort?: number
}

export default function SvgItem(props: SvgItemProps) {
  const { fId, imgUrl, ptnUrl, distort = 0 } = props

  return (
    <svg viewBox="0 0 600 400" preserveAspectRatio="xMidYMid meet">
      <filter id={fId} x="-50%" y="-50%" width="200%" height="200%">
        <feImage
          xlinkHref={ptnUrl}
          x="0"
          y="0"
          width="100%"
          height="100%"
          preserveAspectRatio="none"
        />
        {/* desaturate the image */}
        <feColorMatrix type="saturate" values="0" result="IMAGE" />
        {/* decrease level of details so the effect on text is more realistic */}
        <feGaussianBlur in="IMAGE" stdDeviation="0.5" result="MAP" />
        {/* use the displacement map to distort the text */}
        <feDisplacementMap
          in="SourceGraphic"
          in2="MAP"
          scale={distort}
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
      <g filter={`url(#${fId})`}>
        {/* <text
          dx="60"
          dy="200"
          fontSize="10em"
          transform="translate(-20 30) rotate(-7)"
          fill="#11cbe1"
        >
          {text}
        </text> */}
        <image href={imgUrl} x="0" y="0" width="100%" height="100%" />
      </g>
    </svg>
  )
}
