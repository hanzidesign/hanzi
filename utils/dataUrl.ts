const ABORT_ERROR_NAME = 'AbortError'

export async function fetchDataUrl(url: string, signal?: AbortSignal) {
  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new Error(`Failed to load ${url}`)
  }
  const blob = await response.blob()
  if (!blob.type.startsWith('image/')) {
    throw new Error(`Expected image response from ${url}, got ${blob.type || 'unknown content type'}`)
  }
  return readBlobAsDataUrl(blob, signal)
}

export function readBlobAsDataUrl(blob: Blob, signal?: AbortSignal) {
  return new Promise<string>((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError())
      return
    }

    const reader = new FileReader()
    let settled = false

    const cleanup = () => {
      signal?.removeEventListener('abort', abort)
    }
    const settle = (fn: () => void) => {
      if (settled) return
      settled = true
      cleanup()
      fn()
    }
    const abort = () => {
      if (reader.readyState === FileReader.LOADING) {
        reader.abort()
      }
      settle(() => reject(createAbortError()))
    }

    reader.addEventListener(
      'load',
      () => {
        settle(() => {
          if (typeof reader.result === 'string') {
            resolve(reader.result)
          } else {
            reject(new Error('Expected FileReader data URL result.'))
          }
        })
      },
      { once: true }
    )
    reader.addEventListener('error', () => settle(() => reject(reader.error ?? new Error('Failed to read blob.'))), {
      once: true,
    })
    reader.addEventListener('abort', () => settle(() => reject(createAbortError())), { once: true })
    signal?.addEventListener('abort', abort, { once: true })
    reader.readAsDataURL(blob)
  })
}

export function isAbortError(error: unknown) {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === ABORT_ERROR_NAME
}

function createAbortError() {
  return new DOMException('The operation was aborted.', ABORT_ERROR_NAME)
}
