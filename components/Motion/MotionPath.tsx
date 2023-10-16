import React from 'react'
import _ from 'lodash'
import { useWindowSize } from 'rooks'
import { gsap } from 'lib/gsap'

export type MotionType = 'a' | 'b' | 'x' | 'n'

type Point = [number, number]
type Axis = [1 | -1, 1 | -1]

interface MotionPathProps {
  id: string
  element: React.ReactElement
  type: MotionType
  paused: boolean
  offsetX: number
  offsetY: number
  durations: [number, number]
  smoothing?: number
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

const Root = styled(Box)({
  display: 'inline-block',
})

export default function MotionPath(props: MotionPathProps) {
  const { id, element, type, paused, offsetX, offsetY, durations, smoothing = 0.25 } = props
  const target = `#${id}`

  const { innerWidth, innerHeight } = useWindowSize()

  const [init, setInit] = React.useState(false)
  const [play, setPlay] = React.useState(false)

  const softBezier = React.useCallback(
    (target: string) => {
      const start: Point = [Number(gsap.getProperty(target, 'x')), Number(gsap.getProperty(target, 'y'))]
      const points: Point[] = [start, ...getRandomPoints(start, innerWidth, innerHeight, offsetX, offsetY, type)]

      return getPath(points, smoothing)
    },
    [innerWidth, innerHeight, offsetX, offsetY]
  )

  const tl = React.useMemo(() => {
    if (!id) {
      return
    }

    return gsap.timeline({
      repeat: -1,
      repeatRefresh: true,
    })
  }, [id])

  React.useEffect(() => {
    if (init) {
      return
    }

    setInit(true)

    if (innerWidth && innerHeight) {
      const x = gsap.utils.random(offsetX, innerWidth - offsetX)
      const y = gsap.utils.random(offsetY, innerHeight - offsetY)

      gsap.set(target, {
        x,
        y,
      })
    }
  }, [init, innerWidth, innerHeight])

  React.useEffect(() => {
    if (!tl) {
      return
    }

    tl.clear()

    tl.set(target, {
      xPercent: -50,
      yPercent: -50,
    })

    // start
    tl.to(target, {
      motionPath: {
        path: () => softBezier(target),
      },
      transformOrigin: '50% 50%',
      duration: gsap.utils.random(durations[0], durations[1]),
      ease: 'none',
    })
  }, [tl, target, softBezier, durations, offsetX, offsetY])

  React.useEffect(() => {
    if (init) {
      setPlay(true)
    }
  }, [init])

  React.useEffect(() => {
    if (tl) {
      if (play && !paused) {
        tl.play()
      } else {
        tl.pause()
      }
    }
  }, [tl, play, paused])

  React.useEffect(() => {
    return () => {
      tl?.kill()
    }
  }, [tl])

  return (
    <>
      <Root id={id}>{element}</Root>
    </>
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

  const x =
    xAxis > 0 ? gsap.utils.random(offsetX / 3 + w, width - offsetX) : gsap.utils.random(offsetX, w - offsetX / 3)
  const y =
    yAxis < 0 ? gsap.utils.random(offsetY / 3 + h, height - offsetY) : gsap.utils.random(offsetY, h - offsetY / 3)

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
