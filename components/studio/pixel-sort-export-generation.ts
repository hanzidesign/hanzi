export type PixelSortExportGenerationStatus =
  | 'presented'
  | 'stale'
  | 'failed'
  | 'disposed'

export type PixelSortExportGenerationResult = Readonly<{
  status: PixelSortExportGenerationStatus
  requestId: number
  error?: unknown
}>

export type PixelSortExportGenerationRequest<Input, Output, Texture> = Readonly<{
  requestId: number
  readback: () => Promise<Input>
  render: (input: Input) => Promise<Output>
  createTexture: (output: Output) => Texture
  present: (texture: Texture) => void
  acknowledge: () => void
  onError?: (error: unknown) => void
}>

type Pending<Input, Output, Texture> = {
  token: number
  request: PixelSortExportGenerationRequest<Input, Output, Texture>
  resolve: (result: PixelSortExportGenerationResult) => void
}

/**
 * Coordinates the asynchronous exact-export pipeline. Token checks surround
 * every side effect so a late readback or worker response can never replace a
 * newer export frame or acknowledge the wrong request.
 */
export class PixelSortExportGenerationCoordinator<Input, Output, Texture> {
  private generation = 0
  private active: Pending<Input, Output, Texture> | null = null
  private pending: Pending<Input, Output, Texture> | null = null
  private disposed = false

  request(
    request: PixelSortExportGenerationRequest<Input, Output, Texture>,
  ): Promise<PixelSortExportGenerationResult> {
    if (this.disposed) {
      return Promise.resolve({ status: 'disposed', requestId: request.requestId })
    }

    const token = ++this.generation
    const promise = new Promise<PixelSortExportGenerationResult>((resolve) => {
      if (this.pending) {
        this.pending.resolve({ status: 'stale', requestId: this.pending.request.requestId })
      }
      this.pending = { token, request, resolve }
    })
    this.pump()
    return promise
  }

  invalidate() {
    this.generation += 1
    if (this.pending) {
      this.pending.resolve({ status: 'stale', requestId: this.pending.request.requestId })
      this.pending = null
    }
  }

  dispose() {
    if (this.disposed) return
    this.invalidate()
    this.disposed = true
  }

  isCurrent(token: number) {
    return !this.disposed && token === this.generation
  }

  private pump() {
    if (this.disposed || this.active || !this.pending) return
    const current = this.pending
    this.pending = null
    this.active = current
    void this.run(current)
  }

  private async run(current: Pending<Input, Output, Texture>) {
    const { request, token } = current
    try {
      const input = await request.readback()
      if (!this.isCurrent(token)) {
        current.resolve({ status: 'stale', requestId: request.requestId })
        return
      }

      const output = await request.render(input)
      if (!this.isCurrent(token)) {
        current.resolve({ status: 'stale', requestId: request.requestId })
        return
      }

      const texture = request.createTexture(output)
      if (!this.isCurrent(token)) {
        disposeTexture(texture)
        current.resolve({ status: 'stale', requestId: request.requestId })
        return
      }

      request.present(texture)
      if (!this.isCurrent(token)) {
        current.resolve({ status: 'stale', requestId: request.requestId })
        return
      }
      request.acknowledge()
      current.resolve({ status: 'presented', requestId: request.requestId })
    } catch (error) {
      if (!this.isCurrent(token)) {
        current.resolve({ status: 'stale', requestId: request.requestId })
      } else {
        request.onError?.(error)
        current.resolve({ status: 'failed', requestId: request.requestId, error })
      }
    } finally {
      if (this.active === current) this.active = null
      this.pump()
    }
  }
}

export function createPixelSortExportGenerationCoordinator<Input, Output, Texture>() {
  return new PixelSortExportGenerationCoordinator<Input, Output, Texture>()
}

function disposeTexture(texture: unknown) {
  if (texture && typeof texture === 'object' && 'dispose' in texture) {
    const disposable = texture as { dispose?: () => void }
    disposable.dispose?.()
  }
}
