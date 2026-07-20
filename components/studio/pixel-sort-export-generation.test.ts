import { describe, expect, it, vi } from 'vitest'

import { createPixelSortExportGenerationCoordinator } from './pixel-sort-export-generation'

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })
  return { promise, resolve, reject }
}

function request(
  requestId: number,
  readback: () => Promise<number>,
  events: string[],
) {
  return {
    requestId,
    readback,
    render: async (input: number) => input + 1,
    createTexture: (output: number) => ({ output, dispose: vi.fn() }),
    present: (texture: { output: number }) => events.push(`present:${texture.output}`),
    acknowledge: () => events.push(`ack:${requestId}`),
    onError: () => events.push(`error:${requestId}`),
  }
}

describe('Pixel Sort exact export generation coordinator', () => {
  it('supersedes a request but waits for the in-flight work to settle', async () => {
    const firstReadback = deferred<number>()
    const secondReadback = deferred<number>()
    const events: string[] = []
    const coordinator = createPixelSortExportGenerationCoordinator<number, number, { output: number }>()

    const first = coordinator.request(request(1, () => firstReadback.promise, events))
    const second = coordinator.request(request(2, () => secondReadback.promise, events))
    expect(events).toEqual([])

    firstReadback.resolve(10)
    await expect(first).resolves.toMatchObject({ status: 'stale', requestId: 1 })
    expect(events).toEqual([])

    secondReadback.resolve(20)
    await expect(second).resolves.toMatchObject({ status: 'presented', requestId: 2 })
    expect(events).toEqual(['present:21', 'ack:2'])
  })

  it('invalidates stale source, model, settings, or dimension work through one API', async () => {
    const readback = deferred<number>()
    const events: string[] = []
    const coordinator = createPixelSortExportGenerationCoordinator<number, number, { output: number }>()
    const result = coordinator.request(request(3, () => readback.promise, events))

    coordinator.invalidate()
    readback.resolve(30)

    await expect(result).resolves.toMatchObject({ status: 'stale', requestId: 3 })
    expect(events).toEqual([])
  })

  it('disposes and invalidates in-flight work without acknowledging it', async () => {
    const readback = deferred<number>()
    const events: string[] = []
    const coordinator = createPixelSortExportGenerationCoordinator<number, number, { output: number }>()
    const result = coordinator.request(request(4, () => readback.promise, events))

    coordinator.dispose()
    readback.resolve(40)

    await expect(result).resolves.toMatchObject({ status: 'stale', requestId: 4 })
    expect(events).toEqual([])
    await expect(coordinator.request(request(5, Promise.resolve.bind(Promise, 50) as () => Promise<number>, events)))
      .resolves.toMatchObject({ status: 'disposed', requestId: 5 })
  })

  it('accepts the current request and creates/presents/acknowledges exactly once', async () => {
    const events: string[] = []
    const createTexture = vi.fn((output: number) => ({ output, dispose: vi.fn() }))
    const present = vi.fn((texture: { output: number }) => events.push(`present:${texture.output}`))
    const acknowledge = vi.fn(() => events.push('ack'))
    const coordinator = createPixelSortExportGenerationCoordinator<number, number, { output: number }>()

    const result = coordinator.request({
      requestId: 6,
      readback: async () => 60,
      render: async (input) => input + 1,
      createTexture,
      present,
      acknowledge,
    })

    await expect(result).resolves.toMatchObject({ status: 'presented', requestId: 6 })
    expect(createTexture).toHaveBeenCalledWith(61)
    expect(present).toHaveBeenCalledOnce()
    expect(acknowledge).toHaveBeenCalledOnce()
    expect(events).toEqual(['present:61', 'ack'])
  })

  it('rejects stale failures without resetting the current request', async () => {
    const firstReadback = deferred<number>()
    const secondReadback = deferred<number>()
    const events: string[] = []
    const coordinator = createPixelSortExportGenerationCoordinator<number, number, { output: number }>()
    const first = coordinator.request(request(7, () => firstReadback.promise, events))
    const second = coordinator.request(request(8, () => secondReadback.promise, events))

    firstReadback.reject(new Error('late failure'))
    await expect(first).resolves.toMatchObject({ status: 'stale', requestId: 7 })
    expect(events).toEqual([])
    secondReadback.resolve(80)
    await expect(second).resolves.toMatchObject({ status: 'presented', requestId: 8 })
    expect(events).toContain('ack:8')
    expect(events).not.toContain('error:7')
  })

  it('reports a current failure and accepts a later retry', async () => {
    const events: string[] = []
    const coordinator = createPixelSortExportGenerationCoordinator<number, number, { output: number }>()

    const failed = coordinator.request(request(9, async () => {
      throw new Error('readback failed')
    }, events))

    await expect(failed).resolves.toMatchObject({ status: 'failed', requestId: 9 })
    expect(events).toEqual(['error:9'])

    const retried = coordinator.request(request(9, async () => 90, events))
    await expect(retried).resolves.toMatchObject({ status: 'presented', requestId: 9 })
    expect(events).toContain('ack:9')
  })
})
