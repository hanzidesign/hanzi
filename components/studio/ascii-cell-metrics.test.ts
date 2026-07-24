import { describe, expect, it } from 'vitest'

import {
  ASCII_CELL_SIZE_MAX,
  ASCII_CELL_SIZE_MIN,
  DEFAULT_ASCII_SCALE,
  ASCII_SCALE_MAX,
  ASCII_SCALE_MIN,
  asciiCellSizeToScale,
  asciiScaleToCellSize,
} from './ascii-cell-metrics'

describe('ASCII cell metrics', () => {
  it('maps Scale 1-20 to the renderer cell-size range', () => {
    expect(DEFAULT_ASCII_SCALE).toBe(6)
    expect(ASCII_SCALE_MIN).toBe(1)
    expect(ASCII_SCALE_MAX).toBe(20)
    expect(ASCII_CELL_SIZE_MIN).toBe(1)
    expect(ASCII_CELL_SIZE_MAX).toBe(64)
    expect(asciiScaleToCellSize(1)).toBe(1)
    expect(asciiScaleToCellSize(20)).toBe(64)
    expect(asciiScaleToCellSize(DEFAULT_ASCII_SCALE)).toBe(18)
    expect(asciiScaleToCellSize(0)).toBe(1)
    expect(asciiScaleToCellSize(40)).toBe(64)
  })

  it('maps the persisted cell size back to the UI Scale value', () => {
    expect(asciiCellSizeToScale(1)).toBe(1)
    expect(asciiCellSizeToScale(64)).toBe(20)
    expect(asciiCellSizeToScale(12)).toBe(4.3)
  })
})
