'use client'

import { useState, useEffect } from 'react'
import { isAbortError, readBlobAsDataUrl } from '@/utils/dataUrl'

export default function useFileReader(file: File | null) {
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setResult(null)
      return
    }

    const controller = new AbortController()

    readBlobAsDataUrl(file, controller.signal)
      .then(setResult)
      .catch((error) => {
        if (!isAbortError(error)) {
          setResult(null)
        }
      })

    return () => {
      controller.abort()
    }
  }, [file])

  return result
}
