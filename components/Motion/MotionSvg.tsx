import _ from 'lodash'
import { useWindowSize } from 'rooks'
import MotionPath, { MotionPathProps } from 'components/Motion/MotionPath'
import MotionShape from 'components/Motion/MotionShape'

type MotionSvgProps = {
  index: number
  pathProps?: Partial<MotionPathProps>
}

const sizes = [0.2, 0.4, 0.5, 0.6, 0.8]

export default function MotionSvg(props: MotionSvgProps) {
  const { index, pathProps = {} } = props
  const { innerWidth, innerHeight } = useWindowSize()

  // no view
  if (!innerWidth || !innerHeight) return null

  const length = _.min([innerWidth, innerHeight]) || 300
  const size = sizes[index % sizes.length]
  const width = Math.round(length * size)
  const offsetX = Math.round(innerWidth / 10)
  const offsetY = Math.round(innerHeight / 10)

  return (
    <MotionPath
      type="a"
      initX={_.random(0, innerWidth)}
      initY={_.random(0, innerHeight)}
      offsetX={offsetX}
      offsetY={offsetY}
      {...pathProps}
    >
      <MotionShape index={index} width={width} />
    </MotionPath>
  )
}
