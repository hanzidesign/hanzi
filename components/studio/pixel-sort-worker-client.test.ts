import { describe, expect, it } from 'vitest'

import { DEFAULT_PIXEL_SORT_SETTINGS } from './pixel-sort-core'
import {
  PixelSortWorkerClient,
  PixelSortWorkerDisposedError,
  PixelSortWorkerSupersededError,
  type PixelSortWorkerPort,
} from './pixel-sort-worker-client'
import type {
  PixelSortWorkerRenderInput,
  PixelSortWorkerRenderRequest,
  PixelSortWorkerRenderResponse,
} from './pixel-sort-worker-protocol'

describe('PixelSortWorkerClient', () => {
  it('transfers the source buffer and resolves the matching worker result', async () => {
    const worker = new FakePixelSortWorker()
    const client = new PixelSortWorkerClient(worker)
    const input = createInput(1)

    const resultPromise = client.render(input)

    expect(worker.messages).toHaveLength(1)
    expect(worker.messages[0].message.rgba).toBe(input.rgba)
    expect(worker.messages[0].transfer).toEqual([input.rgba])

    const output = new Uint8Array([9, 8, 7, 6]).buffer
    worker.respond({ id: 1, ok: true, width: 1, height: 1, rgba: output })

    await expect(resultPromise).resolves.toEqual({ width: 1, height: 1, rgba: output })
  })

  it('keeps one job in flight and rejects its result once a newer frame exists', async () => {
    const worker = new FakePixelSortWorker()
    const client = new PixelSortWorkerClient(worker)
    const first = client.render(createInput(1))
    const second = client.render(createInput(2))

    expect(worker.messages).toHaveLength(1)

    worker.respond(successFor(worker.messages[0].message))

    await expect(first).rejects.toBeInstanceOf(PixelSortWorkerSupersededError)
    expect(worker.messages).toHaveLength(2)
    expect(worker.messages[1].message.id).toBe(2)

    worker.respond(successFor(worker.messages[1].message))
    await expect(second).resolves.toMatchObject({ width: 1, height: 1 })
  })

  it('coalesces queued work to the latest request', async () => {
    const worker = new FakePixelSortWorker()
    const client = new PixelSortWorkerClient(worker)
    const first = client.render(createInput(1))
    const second = client.render(createInput(2))
    const third = client.render(createInput(3))

    await expect(second).rejects.toBeInstanceOf(PixelSortWorkerSupersededError)
    expect(worker.messages).toHaveLength(1)

    worker.respond(successFor(worker.messages[0].message))
    await expect(first).rejects.toBeInstanceOf(PixelSortWorkerSupersededError)
    expect(worker.messages).toHaveLength(2)
    expect(new Uint8Array(worker.messages[1].message.rgba)[0]).toBe(3)

    worker.respond(successFor(worker.messages[1].message))
    await expect(third).resolves.toMatchObject({ width: 1, height: 1 })
  })

  it('ignores a response that does not match the current request id', async () => {
    const worker = new FakePixelSortWorker()
    const client = new PixelSortWorkerClient(worker)
    const render = client.render(createInput(1))
    let settled = false
    void render.finally(() => { settled = true })

    worker.respond({ id: 999, ok: false, error: 'stale' })
    await Promise.resolve()
    expect(settled).toBe(false)

    worker.respond(successFor(worker.messages[0].message))
    await expect(render).resolves.toMatchObject({ width: 1, height: 1 })
  })

  it('rejects an explicit worker failure and continues with queued work', async () => {
    const worker = new FakePixelSortWorker()
    const client = new PixelSortWorkerClient(worker)
    const first = client.render(createInput(1))

    worker.respond({ id: 1, ok: false, error: 'bad frame' })
    await expect(first).rejects.toThrow('bad frame')

    const second = client.render(createInput(2))
    worker.respond(successFor(worker.messages[1].message))
    await expect(second).resolves.toMatchObject({ width: 1, height: 1 })
  })

  it('terminates the worker and rejects outstanding and future jobs on dispose', async () => {
    const worker = new FakePixelSortWorker()
    const client = new PixelSortWorkerClient(worker)
    const first = client.render(createInput(1))
    const second = client.render(createInput(2))

    client.dispose()

    expect(worker.terminated).toBe(true)
    await expect(first).rejects.toBeInstanceOf(PixelSortWorkerDisposedError)
    await expect(second).rejects.toBeInstanceOf(PixelSortWorkerDisposedError)
    await expect(client.render(createInput(3))).rejects.toBeInstanceOf(
      PixelSortWorkerDisposedError,
    )
  })

  it('rejects a frame when transferring it to the worker fails', async () => {
    const worker = new FakePixelSortWorker()
    worker.postError = new DOMException('detached', 'DataCloneError')
    const client = new PixelSortWorkerClient(worker)

    await expect(client.render(createInput(1))).rejects.toThrow('detached')
  })
})

function createInput(seed: number): PixelSortWorkerRenderInput {
  return {
    width: 1,
    height: 1,
    rgba: new Uint8Array([seed, seed, seed, 255]).buffer,
    settings: DEFAULT_PIXEL_SORT_SETTINGS,
  }
}

function successFor(request: PixelSortWorkerRenderRequest): PixelSortWorkerRenderResponse {
  return {
    id: request.id,
    ok: true,
    width: request.width,
    height: request.height,
    rgba: new Uint8Array([request.id, 0, 0, 255]).buffer,
  }
}

class FakePixelSortWorker implements PixelSortWorkerPort {
  onmessage: PixelSortWorkerPort['onmessage'] = null
  onerror: PixelSortWorkerPort['onerror'] = null
  messages: Array<{
    message: PixelSortWorkerRenderRequest
    transfer: Transferable[]
  }> = []
  terminated = false
  postError: Error | null = null

  postMessage(message: PixelSortWorkerRenderRequest, transfer: Transferable[]) {
    if (this.postError) throw this.postError
    this.messages.push({ message, transfer })
  }

  terminate() {
    this.terminated = true
  }

  respond(response: PixelSortWorkerRenderResponse) {
    this.onmessage?.(new MessageEvent('message', { data: response }))
  }
}
