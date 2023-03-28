import _ from 'lodash'
import { useState, useEffect } from 'react'
import { useInterval } from '@mantine/hooks'
import type { Job } from 'types'

export default function useProgress(job?: Job) {
  const { startAt, ipfsUrl, failed } = job || {}
  const [progress, setProgress] = useState(0)

  const interval = useInterval(() => {
    if (startAt && progress < 100) {
      const diff = Date.now() - startAt
      const v = _.round(diff / 1000)
      const p = v > 100 ? 100 : v
      setProgress(p)

      if (p >= 100 || ipfsUrl) {
        interval.stop()
      }
    }
  }, 1000)

  useEffect(() => {
    if (startAt && !ipfsUrl) {
      interval.start()
    }
    return interval.stop
  }, [startAt, ipfsUrl])

  useEffect(() => {
    if (failed) {
      setProgress(0)
      interval.stop()
    }
  }, [failed])

  return [progress, interval] as const
}
