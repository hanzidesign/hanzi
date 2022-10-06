import { useState, useEffect } from 'react'

export default function useFileReader(file: File | null) {
  const [result, setResult] = useState<string | ArrayBuffer | null>(null)

  useEffect(() => {
    let fileReader: FileReader
    let isCancel = false

    if (file) {
      fileReader = new FileReader()
      fileReader.onload = (e) => {
        const { result } = e.target || {}
        if (result && !isCancel) {
          setResult(result)
        }
      }
      fileReader.readAsDataURL(file)
    } else {
      setResult(null)
    }

    return () => {
      isCancel = true
      if (fileReader && fileReader.readyState === 1) {
        fileReader.abort()
      }
    }
  }, [file])

  return result
}
