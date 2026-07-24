import { describe, expect, it } from 'vitest'
import {
  createSourceRenderInvalidationState,
  markSourceRenderDirty,
  markSourceRenderRendered,
  shouldRenderSource,
} from './source-render-dirty'

const idlePreview = {
  animationPlaying: false,
  autoRotateActive: false,
  gpuDeformActive: false,
  exportRender: false,
  requestId: 0,
} as const

describe('source-render invalidation', () => {
  it('renders initially, then stays idle until content is dirty', () => {
    const state = createSourceRenderInvalidationState()

    expect(shouldRenderSource(state, idlePreview)).toBe(true)
    markSourceRenderRendered(state, idlePreview)
    expect(shouldRenderSource(state, idlePreview)).toBe(false)

    markSourceRenderDirty(state)
    expect(shouldRenderSource(state, idlePreview)).toBe(true)
  })

  it('supports one-shot invalidation marks for resize and controls', () => {
    const state = createSourceRenderInvalidationState()
    markSourceRenderRendered(state, idlePreview)

    markSourceRenderDirty(state)
    expect(shouldRenderSource(state, idlePreview)).toBe(true)
    markSourceRenderRendered(state, idlePreview)
    expect(shouldRenderSource(state, idlePreview)).toBe(false)
  })

  it('renders continuously only while playing with rotation or GPU deform', () => {
    const state = createSourceRenderInvalidationState()
    markSourceRenderRendered(state, idlePreview)

    expect(shouldRenderSource(state, {
      ...idlePreview,
      animationPlaying: true,
      autoRotateActive: true,
    })).toBe(true)
    expect(shouldRenderSource(state, {
      ...idlePreview,
      autoRotateActive: true,
    })).toBe(false)
    expect(shouldRenderSource(state, {
      ...idlePreview,
      animationPlaying: true,
      gpuDeformActive: true,
    })).toBe(true)
    expect(shouldRenderSource(state, {
      ...idlePreview,
      gpuDeformActive: true,
    })).toBe(false)
  })

  it('forces each export request once, including paused exports', () => {
    const state = createSourceRenderInvalidationState()
    markSourceRenderRendered(state, {
      exportRender: true,
      requestId: 1,
    })

    const pausedRequestOne = {
      ...idlePreview,
      exportRender: true,
      requestId: 1,
    }
    expect(shouldRenderSource(state, pausedRequestOne)).toBe(false)

    const pausedRequestTwo = {
      ...pausedRequestOne,
      requestId: 2,
    }
    expect(shouldRenderSource(state, pausedRequestTwo)).toBe(true)
    markSourceRenderRendered(state, pausedRequestTwo)
    expect(shouldRenderSource(state, pausedRequestTwo)).toBe(false)
  })
})
