import { describe, expect, it } from 'vitest'
import {
  createCharacterRotationSnapshot,
  ExportFrameAckGate,
  normalizeRotationRadians,
} from './studio-render-context'

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
