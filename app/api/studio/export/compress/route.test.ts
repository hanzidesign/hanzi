import { describe, expect, it } from 'vitest'

import {
  MAX_STUDIO_EXPORT_INPUT_BYTES,
  RequestBodyLimitError,
  readRequestBody,
} from './route'

describe('Studio export compression request body limits', () => {
  it('rejects an oversized Content-Length before consuming the stream', async () => {
    let started = false
    const stream = {
      getReader() {
        started = true
        throw new Error('body should not be read')
      },
    }
    const request = {
      headers: new Headers({ 'content-length': String(MAX_STUDIO_EXPORT_INPUT_BYTES + 1) }),
      body: stream as unknown as ReadableStream<Uint8Array>,
    } as Request

    await expect(readRequestBody(request, 4)).rejects.toBeInstanceOf(RequestBodyLimitError)
    expect(started).toBe(false)
  })

  it('cancels a chunked stream before concatenating bytes over the limit', async () => {
    let canceled = false
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]))
        controller.enqueue(new Uint8Array([4, 5]))
      },
      cancel() {
        canceled = true
      },
    })
    const request = new Request('http://localhost/api/studio/export/compress', {
      method: 'POST',
      body: stream,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' })

    await expect(readRequestBody(request, 4)).rejects.toBeInstanceOf(RequestBodyLimitError)
    expect(canceled).toBe(true)
  })

  it('accepts chunked bodies at the exact byte boundary', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]))
        controller.enqueue(new Uint8Array([3, 4]))
        controller.close()
      },
    })
    const request = new Request('http://localhost/api/studio/export/compress', {
      method: 'POST',
      body: stream,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' })

    await expect(readRequestBody(request, 4)).resolves.toEqual(Buffer.from([1, 2, 3, 4]))
  })
})
