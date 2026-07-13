import { describe, expect, it } from 'vitest'

import {
  DEFAULT_EDGE_DETECTION_SETTINGS,
  renderEdgeDetectionReference,
  sampleEdgeDetectionSourceLinear,
  traceEdgeDetectionAt,
  type EdgeDetectionSettings,
} from './edge-detection-core'

describe('Edge Detection CPU reference', () => {
  it('uses normalized linear clamp source sampling', () => {
    const source = new Uint8ClampedArray([
      0, 10, 20, 100, 110, 120, 200, 210, 220, 240, 250, 255,
    ])
    const center = sampleEdgeDetectionSourceLinear(source, 4, 1, 0.5, 0.5)
    expect(center[0]).toBeCloseTo(150 / 255)
    expect(center[1]).toBeCloseTo(160 / 255)
    expect(center[2]).toBeCloseTo(170 / 255)
    expect(sampleEdgeDetectionSourceLinear(source, 4, 1, -1, 2)).toEqual([0, 10 / 255, 20 / 255])
  })

  it('makes every flat field edge-free for every algorithm and Invert flips only the mask', () => {
    for (const algorithm of ['sobel', 'prewitt', 'laplacian'] as const) {
      expect(renderFlat({ algorithm })).toEqual([0, 0, 0])
      expect(renderFlat({ algorithm, invert: true })).toEqual([255, 255, 255])
    }
  })

  it('applies Brightness before Contrast to all samples and Original output', () => {
    expect(renderFlat({
      brightness: 25,
      colorMode: 'original',
      contrast: 50,
      invert: true,
    }, [64, 128, 192])).toEqual([128, 255, 255])
  })

  it('locks Contrast -100 to flat 0.5 and makes Brightness a no-op', () => {
    const source = makeFixture(11, 11)
    const first = trace(source, { brightness: -100, contrast: -100 })
    const second = trace(source, { brightness: 100, contrast: -100 })
    expect(first.combinedEdge).toBeCloseTo(0)
    expect(second.combinedEdge).toBeCloseTo(0)
    expect(first.processedOriginal).toEqual([0.5, 0.5, 0.5])
    expect(second.processedOriginal).toEqual([0.5, 0.5, 0.5])
  })

  it('uses coarse Prewitt but fine Sobel, while Laplacian keeps Laplacian at both scales', () => {
    const source = makeFixture(15, 15)
    const sobel = trace(source, { algorithm: 'sobel' })
    const prewitt = trace(source, { algorithm: 'prewitt' })
    const laplacian = trace(source, { algorithm: 'laplacian' })

    expect(prewitt.coarseEdge).not.toBeCloseTo(sobel.coarseEdge)
    expect(prewitt.fineEdge).toBeCloseTo(sobel.fineEdge, 12)
    expect(laplacian.fineEdge).not.toBeCloseTo(sobel.fineEdge)
  })

  it('combines the two detector scales and uses the exact threshold softness window', () => {
    const source = makeFixture(15, 15)
    const result = trace(source, { threshold: 0.3 })
    expect(result.combinedEdge).toBeCloseTo(Math.max(result.coarseEdge, result.fineEdge * 0.7))
    if (result.combinedEdge <= 0.21) expect(result.mask).toBe(0)
    if (result.combinedEdge >= 0.39) expect(result.mask).toBe(1)
  })

  it('uses hidden Background but ignores hidden Edge Color in Original mode', () => {
    const source = makeFixture(13, 13)
    const base = render(source, {
      colorMode: 'original',
      background: [20, 40, 60],
      edgeColor: [255, 0, 0],
    })
    const changedEdge = render(source, {
      colorMode: 'original',
      background: [20, 40, 60],
      edgeColor: [0, 255, 0],
    })
    const changedBackground = render(source, {
      colorMode: 'original',
      background: [120, 140, 160],
      edgeColor: [255, 0, 0],
    })
    expect(changedEdge).toEqual(base)
    expect(changedBackground).not.toEqual(base)
  })

  it('keeps chosen Mono colors raw while B/C changes only the detection mask', () => {
    expect(renderFlat({
      brightness: 100,
      colorMode: 'custom',
      contrast: 100,
      edgeColor: [7, 17, 27],
      invert: true,
    })).toEqual([7, 17, 27])
  })

  it('makes every functional setting observable in an active context', () => {
    const source = makeFixture(17, 17)
    const cases: Partial<EdgeDetectionSettings>[] = [
      { algorithm: 'prewitt' },
      { algorithm: 'laplacian' },
      { threshold: 0.7 },
      { lineWidth: 3 },
      { invert: true },
      { brightness: 25 },
      { contrast: 50 },
      { colorMode: 'original' },
      { edgeColor: [255, 0, 0] },
      { background: [0, 0, 255] },
    ]
    const base = render(source)
    for (const settings of cases) {
      expect(render(source, settings), JSON.stringify(settings)).not.toEqual(base)
    }
  })

  it('rejects malformed inputs and out-of-contract settings', () => {
    expect(() => renderEdgeDetectionReference({
      height: 1,
      rgb: new Uint8ClampedArray(2),
      settings: DEFAULT_EDGE_DETECTION_SETTINGS,
      width: 1,
    })).toThrow('width * height * 3')
    expect(() => render(makeFixture(3, 3), { threshold: 0 })).toThrow('threshold')
    expect(() => render(makeFixture(3, 3), { lineWidth: 5 })).toThrow('lineWidth')
    expect(() => render(makeFixture(3, 3), { colorMode: 'bad' as 'custom' })).toThrow('colorMode')
  })
})

function renderFlat(settings: Partial<EdgeDetectionSettings> = {}, color: readonly [number, number, number] = [128, 128, 128]) {
  return Array.from(renderEdgeDetectionReference({
    height: 1,
    rgb: new Uint8ClampedArray(color),
    settings: { ...DEFAULT_EDGE_DETECTION_SETTINGS, ...settings },
    width: 1,
  }).data)
}

function trace(source: ReturnType<typeof makeFixture>, settings: Partial<EdgeDetectionSettings>) {
  return traceEdgeDetectionAt({
    ...source,
    settings: { ...DEFAULT_EDGE_DETECTION_SETTINGS, ...settings },
  }, Math.floor(source.width / 2), Math.floor(source.height / 2))
}

function render(source: ReturnType<typeof makeFixture>, settings: Partial<EdgeDetectionSettings> = {}) {
  return renderEdgeDetectionReference({
    ...source,
    settings: { ...DEFAULT_EDGE_DETECTION_SETTINGS, ...settings },
  }).data
}

function makeFixture(width: number, height: number) {
  const rgb = new Uint8ClampedArray(width * height * 3)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 3
      rgb[offset] = (x * 29 + y * 7 + (x > width / 2 ? 80 : 0)) % 256
      rgb[offset + 1] = (x * 11 + y * 31 + (y > height / 2 ? 55 : 0)) % 256
      rgb[offset + 2] = (x * 17 + y * 13 + ((x + y) % 3) * 60) % 256
    }
  }
  return { rgb, width, height }
}
