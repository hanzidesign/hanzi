import { renderPixelSortFrame } from './pixel-sort-core'
import type {
  PixelSortWorkerRenderRequest,
  PixelSortWorkerRenderResponse,
  PixelSortWorkerRenderSuccess,
} from './pixel-sort-worker-protocol'

type PixelSortWorkerScope = {
  onmessage: ((event: MessageEvent<PixelSortWorkerRenderRequest>) => void) | null
  postMessage: (message: PixelSortWorkerRenderResponse, transfer?: Transferable[]) => void
}

const workerScope = self as unknown as PixelSortWorkerScope

workerScope.onmessage = (event) => {
  const response = processPixelSortWorkerRequest(event.data)

  if (response.ok) {
    workerScope.postMessage(response, [response.rgba])
    return
  }

  workerScope.postMessage(response)
}

export function processPixelSortWorkerRequest(
  request: PixelSortWorkerRenderRequest,
): PixelSortWorkerRenderResponse {
  try {
    const frame = renderPixelSortFrame({
      rgba: new Uint8Array(request.rgba),
      width: request.width,
      height: request.height,
      settings: request.settings,
    })
    const rgba = asTransferableBuffer(frame.data)

    return {
      id: request.id,
      ok: true,
      width: frame.width,
      height: frame.height,
      rgba,
    }
  } catch (error) {
    return {
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.message : 'Pixel Sort worker failed',
    }
  }
}

function asTransferableBuffer(data: Uint8ClampedArray): PixelSortWorkerRenderSuccess['rgba'] {
  if (
    data.buffer instanceof ArrayBuffer
    && data.byteOffset === 0
    && data.byteLength === data.buffer.byteLength
  ) {
    return data.buffer
  }

  return data.slice().buffer as ArrayBuffer
}
