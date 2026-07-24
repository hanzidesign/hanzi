export type SourceRenderInvalidationState = {
  sourceDirty: boolean
  lastExportRequestId: number
}

export type SourceRenderDecision = Readonly<{
  animationPlaying: boolean
  autoRotateActive: boolean
  gpuDeformActive: boolean
  exportRender: boolean
  requestId: number
}>

export function createSourceRenderInvalidationState(): SourceRenderInvalidationState {
  return {
    sourceDirty: true,
    lastExportRequestId: 0,
  }
}

export function markSourceRenderDirty(state: SourceRenderInvalidationState) {
  state.sourceDirty = true
}

export function shouldRenderSource(
  state: SourceRenderInvalidationState,
  decision: SourceRenderDecision,
) {
  const exportRequested = decision.exportRender
    && Number.isInteger(decision.requestId)
    && decision.requestId > 0
    && decision.requestId !== state.lastExportRequestId
  const continuouslyAnimated = decision.animationPlaying
    && (decision.autoRotateActive || decision.gpuDeformActive)

  return state.sourceDirty || exportRequested || continuouslyAnimated
}

export function markSourceRenderRendered(
  state: SourceRenderInvalidationState,
  decision: Pick<SourceRenderDecision, 'exportRender' | 'requestId'>,
) {
  state.sourceDirty = false

  if (
    decision.exportRender
    && Number.isInteger(decision.requestId)
    && decision.requestId > 0
  ) {
    state.lastExportRequestId = decision.requestId
  }
}
