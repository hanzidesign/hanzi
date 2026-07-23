import { describe, expect, it } from 'vitest'
import {
  createStudioPreviewFrameRegistry,
  createCharacterRotationSnapshot,
  ExportFrameAckGate,
  normalizeRotationRadians,
  readLatestPreviewPointer,
  reportLatestPreviewPointer,
  resolveDirectionalPixelScale,
  resolveStudioVisualFrameSize,
} from './studio-render-context'

describe('Studio preview visual frame registry', () => {
  it('isolates Studio instances, effects, and render scopes', () => {
    const first = createStudioPreviewFrameRegistry()
    const second = createStudioPreviewFrameRegistry()

    first.report('pixel-sort', 'canvas', 720, 480)
    first.report('pixel-sort', 'pixel-sort', 720, 480)
    first.report('ascii', 'canvas', 640, 640)

    expect(first.capture('pixel-sort')).toMatchObject({
      effectId: 'pixel-sort',
      canvas: { width: 720, height: 480 },
      'pixel-sort': { width: 720, height: 480 },
    })
    expect(first.capture('ascii')).toMatchObject({
      effectId: 'ascii',
      canvas: { width: 640, height: 640 },
    })
    expect(second.capture('pixel-sort')).toEqual({ effectId: 'pixel-sort' })
  })

  it('replaces resized preview frames and returns an immutable export snapshot', () => {
    const registry = createStudioPreviewFrameRegistry()
    const first = registry.report('dots', 'canvas', 640, 360)
    const snapshot = registry.capture('dots')
    const resized = registry.report('dots', 'canvas', 960, 540)

    expect(resized.revision).toBeGreaterThan(first.revision)
    expect(snapshot.canvas).toMatchObject({ width: 640, height: 360 })
    expect(registry.capture('dots').canvas).toMatchObject({ width: 960, height: 540 })
    expect(Object.isFrozen(snapshot)).toBe(true)
    expect(Object.isFrozen(snapshot.canvas)).toBe(true)
  })

  it('sanitizes invalid reports and clears its owned lifecycle state', () => {
    const registry = createStudioPreviewFrameRegistry()

    registry.report('vhs', 'canvas', Number.NaN, 0)
    expect(registry.capture('vhs').canvas).toMatchObject({ width: 1, height: 1 })

    registry.clear()
    expect(registry.capture('vhs')).toEqual({ effectId: 'vhs' })
  })

  it('lets export read its captured scope without writing or borrowing a missing scope', () => {
    const registry = createStudioPreviewFrameRegistry()
    registry.report('halftone', 'canvas', 640, 360)
    const snapshot = registry.capture('halftone')

    expect(resolveStudioVisualFrameSize({
      exportRender: true,
      snapshot,
      scope: 'canvas',
      actualWidth: 2048,
      actualHeight: 2048,
    })).toEqual({ width: 640, height: 360 })
    expect(resolveStudioVisualFrameSize({
      exportRender: true,
      snapshot,
      scope: 'pixel-sort',
      actualWidth: 2048,
      actualHeight: 2048,
    })).toEqual({ width: 2048, height: 2048 })
    expect(registry.capture('halftone')).toEqual(snapshot)
  })
})

describe('directional pixel scaling', () => {
  it('uses independent X and Y ratios', () => {
    expect(resolveDirectionalPixelScale(
      { width: 2048, height: 1024 },
      { width: 512, height: 512 },
      { x: 1, y: 0 },
    )).toBe(4)
    expect(resolveDirectionalPixelScale(
      { width: 2048, height: 1024 },
      { width: 512, height: 512 },
      { x: 0, y: 1 },
    )).toBe(2)
  })

  it('scales diagonal and radial axes by transformed length', () => {
    const diagonal = resolveDirectionalPixelScale(
      { width: 2048, height: 1024 },
      { width: 512, height: 512 },
      { x: Math.SQRT1_2, y: Math.SQRT1_2 },
    )
    const radial = resolveDirectionalPixelScale(
      { width: 900, height: 1200 },
      { width: 600, height: 400 },
      { x: 0.6, y: 0.8 },
    )

    expect(diagonal).toBeCloseTo(Math.sqrt(10))
    expect(radial).toBeCloseTo(Math.hypot(0.6 * 1.5, 0.8 * 3))
  })
})

describe('export frame acknowledgement gate', () => {
  it('waits for content readiness when the composer renders first', () => {
    const gate = new ExportFrameAckGate()

    gate.arm(1)
    expect(gate.consumeIfReady(1, 1)).toBe(false)

    gate.markContentReady(1)
    expect(gate.consumeIfReady(1, 1)).toBe(true)
    expect(gate.consumeIfReady(1, 1)).toBe(false)
  })

  it('ignores stale request ids', () => {
    const gate = new ExportFrameAckGate()

    gate.arm(2)
    gate.markContentReady(1)
    expect(gate.consumeIfReady(1, 1)).toBe(false)
    expect(gate.consumeIfReady(2, 1)).toBe(false)

    gate.markContentReady(2)
    expect(gate.consumeIfReady(2, 1)).toBe(true)
  })

  it('keeps an armed request after zero render calls', () => {
    const gate = new ExportFrameAckGate()

    gate.arm(3)
    gate.markContentReady(3)
    expect(gate.consumeIfReady(3, 0)).toBe(false)
    expect(gate.consumeIfReady(3, 1)).toBe(true)
  })

  it('clears a cancelled request and re-arms cleanly', () => {
    const gate = new ExportFrameAckGate()

    gate.arm(4)
    gate.markContentReady(4)
    gate.clear(4)
    expect(gate.consumeIfReady(4, 1)).toBe(false)

    gate.arm(5)
    expect(gate.consumeIfReady(5, 1)).toBe(false)
    gate.markContentReady(5)
    expect(gate.consumeIfReady(5, 1)).toBe(true)
  })
})

describe('preview pointer snapshot', () => {
  it('provides the preview pointer to the separately mounted export renderer', () => {
    reportLatestPreviewPointer(0.42, -0.35)

    expect(readLatestPreviewPointer()).toEqual({ x: 0.42, y: -0.35 })
  })

  it('ignores nonfinite pointer reports', () => {
    reportLatestPreviewPointer(Number.NaN, 1)

    expect(readLatestPreviewPointer()).toEqual({ x: 0.42, y: -0.35 })
  })
})

describe('character rotation snapshot', () => {
  it('keeps preview and export provider snapshots isolated', () => {
    const previewSnapshot = createCharacterRotationSnapshot()
    const exportSnapshot = createCharacterRotationSnapshot()

    previewSnapshot.report(0.5)
    exportSnapshot.report(0)

    expect(previewSnapshot.read(0)).toBeCloseTo(0.5)
    expect(exportSnapshot.read(0.75)).toBe(0)
  })

  it('ignores nonfinite reports and normalizes finite fallbacks', () => {
    const snapshot = createCharacterRotationSnapshot()

    expect(snapshot.read(Number.NaN)).toBe(0)
    snapshot.report(Number.POSITIVE_INFINITY)
    expect(snapshot.read(3 * Math.PI)).toBeCloseTo(-Math.PI)
    snapshot.report(5 * Math.PI / 2)
    expect(snapshot.read(0)).toBeCloseTo(Math.PI / 2)
  })

  it('normalizes angles to the [-pi, pi] range', () => {
    expect(normalizeRotationRadians(3 * Math.PI / 2)).toBeCloseTo(-Math.PI / 2)
    expect(normalizeRotationRadians(-3 * Math.PI / 2)).toBeCloseTo(Math.PI / 2)
    expect(normalizeRotationRadians(Number.NaN, 5 * Math.PI / 2)).toBeCloseTo(Math.PI / 2)
  })
})
