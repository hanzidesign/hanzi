'use client'

import React from 'react'
import { motion, useMotionValue, animate } from 'framer-motion'
import { paths } from '@/assets/paths'

export type MotionShapeProps = {
  width: number
  index: number
}

const durations = [2, 3, 3, 4, 4, 5]
const colors = ['#fb5bdc', '#0cfe77', '#18cffa', '#16eefb', '#638FFF']

export default function MotionPath(props: MotionShapeProps) {
  const { width, index } = props
  const duration = durations[index % durations.length]

  const [pathIndex, setPathIndex] = React.useState(index % paths.length)
  const progress = useMotionValue(pathIndex)
  const path = paths[index]

  React.useEffect(() => {
    const animation = animate(progress, pathIndex, {
      duration,
      ease: 'linear',
      onComplete: () => {
        if (pathIndex === paths.length - 1) {
          progress.set(0)
          setPathIndex(1)
        } else {
          setPathIndex(pathIndex + 1)
        }
      },
    })

    return animation.stop
  }, [pathIndex])

  return (
    <motion.svg
      viewBox="0 0 240 240"
      width={width}
      animate={{ width: Math.round(width * 1.5) }}
      transition={{
        repeat: Infinity,
        repeatType: 'reverse',
        duration: duration + 2,
        ease: 'linear',
      }}
    >
      <motion.path fill={colors[index % colors.length]} d={path} />
    </motion.svg>
  )
}
