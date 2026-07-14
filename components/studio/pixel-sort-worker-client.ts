import type {
  PixelSortWorkerRenderInput,
  PixelSortWorkerRenderOutput,
  PixelSortWorkerRenderRequest,
  PixelSortWorkerRenderResponse,
} from './pixel-sort-worker-protocol'

type WorkerMessageHandler = ((event: MessageEvent<PixelSortWorkerRenderResponse>) => void) | null
type WorkerErrorHandler = ((event: ErrorEvent) => void) | null

export type PixelSortWorkerPort = {
  onmessage: WorkerMessageHandler
  onerror: WorkerErrorHandler
  postMessage: (message: PixelSortWorkerRenderRequest, transfer: Transferable[]) => void
  terminate: () => void
}

type PixelSortWorkerJob = {
  request: PixelSortWorkerRenderRequest
  resolve: (output: PixelSortWorkerRenderOutput) => void
  reject: (error: Error) => void
  superseded: boolean
}

export class PixelSortWorkerSupersededError extends Error {
  constructor() {
    super('Pixel Sort render request was superseded by a newer frame')
    this.name = 'PixelSortWorkerSupersededError'
  }
}

export class PixelSortWorkerDisposedError extends Error {
  constructor() {
    super('Pixel Sort worker client has been disposed')
    this.name = 'PixelSortWorkerDisposedError'
  }
}

export class PixelSortWorkerClient {
  private nextId = 1
  private inFlight: PixelSortWorkerJob | null = null
  private queued: PixelSortWorkerJob | null = null
  private disposed = false

  constructor(private readonly worker: PixelSortWorkerPort = createPixelSortWorker()) {
    worker.onmessage = this.handleMessage
    worker.onerror = this.handleWorkerError
  }

  render(input: PixelSortWorkerRenderInput): Promise<PixelSortWorkerRenderOutput> {
    if (this.disposed) {
      return Promise.reject(new PixelSortWorkerDisposedError())
    }

    const request: PixelSortWorkerRenderRequest = {
      ...input,
      id: this.nextId,
    }
    this.nextId += 1

    return new Promise((resolve, reject) => {
      const job: PixelSortWorkerJob = {
        request,
        resolve,
        reject,
        superseded: false,
      }

      if (!this.inFlight) {
        this.dispatch(job)
        return
      }

      this.inFlight.superseded = true
      if (this.queued) {
        this.queued.reject(new PixelSortWorkerSupersededError())
      }
      this.queued = job
    })
  }

  dispose() {
    if (this.disposed) return

    this.disposed = true
    this.worker.onmessage = null
    this.worker.onerror = null
    this.worker.terminate()

    const error = new PixelSortWorkerDisposedError()
    this.inFlight?.reject(error)
    this.queued?.reject(error)
    this.inFlight = null
    this.queued = null
  }

  private dispatch(job: PixelSortWorkerJob) {
    this.inFlight = job
    try {
      this.worker.postMessage(job.request, [job.request.rgba])
    } catch (error) {
      this.inFlight = null
      job.reject(normalizeError(error, 'Pixel Sort worker rejected the frame'))
    }
  }

  private handleMessage = (event: MessageEvent<PixelSortWorkerRenderResponse>) => {
    if (this.disposed) return

    const current = this.inFlight
    if (!current || event.data.id !== current.request.id) {
      return
    }

    this.inFlight = null
    if (current.superseded) {
      current.reject(new PixelSortWorkerSupersededError())
    } else if (event.data.ok) {
      current.resolve({
        width: event.data.width,
        height: event.data.height,
        rgba: event.data.rgba,
      })
    } else {
      current.reject(new Error(event.data.error))
    }

    const next = this.queued
    this.queued = null
    if (next) this.dispatch(next)
  }

  private handleWorkerError = (event: ErrorEvent) => {
    if (this.disposed) return

    const error = new Error(event.message || 'Pixel Sort worker failed')
    this.inFlight?.reject(error)
    this.queued?.reject(error)
    this.inFlight = null
    this.queued = null
  }
}

function normalizeError(error: unknown, fallback: string) {
  return error instanceof Error ? error : new Error(fallback)
}

function createPixelSortWorker(): PixelSortWorkerPort {
  return new Worker(new URL('./pixel-sort.worker.ts', import.meta.url), {
    type: 'module',
    name: 'pixel-sort-renderer',
  })
}
