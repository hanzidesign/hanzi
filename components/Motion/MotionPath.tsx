import React from 'react'
import _ from 'lodash'
import { Box } from '@mantine/core'
import { useWindowSize } from 'rooks'
import { motion, useMotionValue, useAnimate, useMotionValueEvent } from 'framer-motion'
import type { BoxProps } from '@mantine/core'

export type MotionType = 'a' | 'b' | 'x' | 'n'

type Point = [number, number]
type Axis = [1 | -1, 1 | -1]

interface MotionPathProps {
  type: MotionType
  initX: number
  initY: number
  offsetX: number
  offsetY: number
  smoothing?: number
  boxProps?: BoxProps
}

const motionType: { [k in string]: Axis[] } = {
  a: [
    [1, 1],
    [1, -1],
    [-1, -1],
    [-1, 1],
  ],

  b: [
    [1, 1],
    [-1, 1],
    [-1, -1],
    [1, -1],
  ],

  x: [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ],

  n: [
    [1, 1],
    [-1, -1],
    [-1, 1],
    [1, -1],
  ],
}

export default function MotionPath(props: React.PropsWithChildren<MotionPathProps>) {
  const { children, type, initX, initY, offsetX, offsetY, smoothing = 0.25, boxProps = {} } = props

  const initRef = React.useRef(false)
  const pointRef = React.useRef({ x: initX, y: initY })

  const { innerWidth, innerHeight } = useWindowSize()
  const width = innerWidth || 0
  const height = innerHeight || 0

  const [scope, animate] = useAnimate<SVGPathElement>()
  const x = useMotionValue(initX)
  const y = useMotionValue(initY)
  const pathLength = useMotionValue(0)

  const [path, setPath] = React.useState('')

  const softBezier = React.useCallback(() => {
    const start: Point = [pointRef.current.x, pointRef.current.y]
    console.log(start)
    const points: Point[] = [start, ...getRandomPoints(start, innerWidth, innerHeight, offsetX, offsetY, type)]
    // set next start point
    const lastPoint = _.last(points)
    if (lastPoint) {
      pointRef.current.x = lastPoint[0]
      pointRef.current.y = lastPoint[1]
    }
    return getPath(points, smoothing)
  }, [innerWidth, innerHeight, offsetX, offsetY, type])

  // subscribe
  useMotionValueEvent(pathLength, 'change', (latest) => {
    const el = scope.current
    const totalLength = el.getTotalLength()
    const progress = latest / 100
    const latestPoint = el.getPointAtLength(progress * totalLength)
    x.set(latestPoint.x)
    y.set(latestPoint.y)
  })

  React.useEffect(() => {
    // for init
    if (initRef.current) {
      return
    }

    if (innerWidth && innerHeight) {
      initRef.current = true
      setPath(softBezier())
    }
  }, [innerWidth, innerHeight])

  React.useEffect(() => {
    if (!path) return
    // start

    const totalLength = scope.current.getTotalLength()
    const duration = _.max([6, totalLength / 50])

    const controls = animate(pathLength, 100, {
      duration,
      ease: 'linear',
      onComplete: () => {
        // restart
        pathLength.set(0)
        setPath(softBezier())
        console.log('onComplete')
      },
    })
    return controls.stop
  }, [path])

  return (
    <Box pos="absolute" left={0} top={0} w="100%" h="100%" {...boxProps}>
      <motion.svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        <motion.path ref={scope} d={path} stroke="#1f88eb" strokeWidth="2" fill="none" pathLength={pathLength} />
      </motion.svg>
      <Box pos="absolute" left={0} top={0} style={{ transform: 'translate(-50%, -50%)' }}>
        <motion.div style={{ x, y }}>
          <span>{children}</span>
        </motion.div>
      </Box>
    </Box>
  )
}

function getPath(points: Point[], smoothing: number) {
  // build the d attributes by looping over the points
  return points.reduce(
    (acc, point, i, a) => (i === 0 ? `M ${point[0]},${point[1]}` : `${acc} ${bezierCommand(point, i, a, smoothing)}`),
    ''
  )
}

function bezierCommand(point: Point, i: number, a: Point[], smoothing: number) {
  // start control point
  const cps = controlPoint(a[i - 1], a[i - 2], point, smoothing)

  // end control point
  const cpe = controlPoint(point, a[i - 1], a[i + 1], smoothing, true)
  return `C ${cps[0]},${cps[1]} ${cpe[0]},${cpe[1]} ${point[0]},${point[1]}`
}

function controlPoint(current: Point, previous: Point, next: Point, smoothing: number, reverse?: boolean) {
  // When 'current' is the first or last point of the array
  // 'previous' or 'next' don't exist.
  // Replace with 'current'
  const p = previous || current
  const n = next || current

  // Properties of the opposed-line
  const o = line(p, n)

  // If is end-control-point, add PI to the angle to go backward
  const angle = o.angle + (reverse ? Math.PI : 0)
  const length = o.length * smoothing

  // The control point position is relative to the current point
  const x = current[0] + Math.cos(angle) * length
  const y = current[1] + Math.sin(angle) * length
  return [x, y]
}

function line(pointA: Point, pointB: Point) {
  const lengthX = pointB[0] - pointA[0]
  const lengthY = pointB[1] - pointA[1]
  return {
    length: Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)),
    angle: Math.atan2(lengthY, lengthX),
  }
}

function getRandomPoints(
  point: Point,
  width: number | null,
  height: number | null,
  offsetX: number,
  offsetY: number,
  type: MotionType
): Point[] {
  if (width && height) {
    const axis = getAxis(point, width, height)
    const axisOrder = getAxisOrder(axis, type)

    return axisOrder.map((o) => getPointByAxis(o, width, height, offsetX, offsetY))
  }
  return []
}

function getPointByAxis(axis: Axis, width: number, height: number, offsetX: number, offsetY: number): Point {
  const [xAxis, yAxis] = axis
  const w = width / 2
  const h = height / 2

  const x = xAxis > 0 ? _.random(offsetX / 3 + w, width - offsetX) : _.random(offsetX, w - offsetX / 3)
  const y = yAxis < 0 ? _.random(offsetY / 3 + h, height - offsetY) : _.random(offsetY, h - offsetY / 3)

  return [x, y]
}

function getAxis(point: Point, width: number, height: number): Axis {
  const [x, y] = point
  const xAxis = x <= width / 2 ? -1 : 1
  const yAxis = y <= height / 2 ? 1 : -1

  return [xAxis, yAxis]
}

function getAxisOrder(axis: Axis, type: MotionType) {
  const motion = motionType[type]
  const index = _.findIndex(motion, (o) => o.join(',') === axis.join(',')) + 1

  return _.times(4, String).map((o, i) => {
    return motion[(index + i) % 4]
  })
}
