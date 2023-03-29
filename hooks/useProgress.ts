import _ from 'lodash'
import { useState, useEffect } from 'react'
import { useInterval } from '@mantine/hooks'
import type { Job } from 'types'

const max = 96

export default function useProgress(job?: Job) {
  const { startAt, ipfsUrl, failed } = job || {}
  const [progress, setProgress] = useState(0)

  const interval = useInterval(() => {
    setProgress((state) => {
      const v = state + _.random(6, 10)
      const p = v > max ? max : v
      return p
    })
  }, 1000)

  useEffect(() => {
    if (startAt && !ipfsUrl && progress < max) {
      interval.start()
    }

    if (ipfsUrl && progress < max) {
      interval.stop()
      setProgress(100)
    }

    if (failed && progress > 0) {
      interval.stop()
      setProgress(0)
    }

    return interval.stop
  }, [startAt, ipfsUrl, failed, progress])

  return [progress, interval] as const
}
