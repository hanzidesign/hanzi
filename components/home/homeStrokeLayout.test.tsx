import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  KAISHU_CELL_PITCH,
  KAISHU_DEPTH_OPACITIES,
  KAISHU_DOT_LOCAL_SCALE,
  KAISHU_GRID_SIZE,
  KAISHU_JITTER_MAX,
  KAISHU_MAX_LOCAL_HEIGHT,
  KAISHU_MAX_LOCAL_WIDTH,
  KAISHU_MAX_RELATIVE_PARALLAX_X,
  KAISHU_MAX_RELATIVE_PARALLAX_Y,
  KAISHU_MAX_STROKE_WIDTH,
  KAISHU_ROTATION_MAX_DEGREES,
  KAISHU_SCALE_MAX,
  KAISHU_SCALE_MIN,
  KAISHU_STROKE_COUNT,
  KAISHU_STROKE_CROPS,
  KAISHU_STROKE_OUTLINES,
  KAISHU_STROKE_SOURCE_PATHS,
  KaishuStrokePaths,
  createKaishuStrokePlacements,
  getKaishuStrokePlacements,
  serializeKaishuStrokeMaskSvg,
} from './homeStrokeLayout'

describe('Kaishu stroke outline data', () => {
  it('renders exactly 57 closed SVG paths, split 19 per depth layer', () => {
    const markup = renderToStaticMarkup(
      <svg viewBox="0 0 1000 1000">
        <KaishuStrokePaths layerClassNames={['far', 'mid', 'near']} />
      </svg>
    )
    const pathDs = [...markup.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map((match) => match[1])

    expect(pathDs).toHaveLength(KAISHU_STROKE_COUNT)
    expect(KAISHU_STROKE_COUNT).toBe(57)
    expect((markup.match(/data-kaishu-stroke="true"/g) ?? [])).toHaveLength(57)
    const farStart = markup.indexOf('class="far"')
    const midStart = markup.indexOf('class="mid"')
    const nearStart = markup.indexOf('class="near"')
    expect((markup.slice(farStart, midStart).match(/data-kaishu-stroke="true"/g) ?? [])).toHaveLength(19)
    expect((markup.slice(midStart, nearStart).match(/data-kaishu-stroke="true"/g) ?? [])).toHaveLength(19)
    expect((markup.slice(nearStart).match(/data-kaishu-stroke="true"/g) ?? [])).toHaveLength(19)
    expect(pathDs.every((d) => /[Zz]$/.test(d))).toBe(true)
    expect([...new Set(pathDs)]).toEqual([...KAISHU_STROKE_SOURCE_PATHS])
    expect(markup).not.toMatch(/<text\b|font-family|font-size/i)
    const strokeWrappers = [...markup.matchAll(/<g data-kaishu-stroke="true"([^>]*)>/g)]
    expect(strokeWrappers).toHaveLength(57)
    expect(strokeWrappers.every((match) => !/\btransform=|\bstyle=/.test(match[1]))).toBe(true)
    expect(markup).not.toMatch(/\bopacity=|\bstroke-width=|\bstyle=/i)
    expect((markup.match(/transform="translate\(0 450\) scale\(\.1 -\.1\)"/g) ?? [])).toHaveLength(57)
    expect(markup).toMatch(/vector-effect="non-scaling-stroke"/)
  })

  it('uses only the supplied source contours inside the local geometry budget', () => {
    expect(KAISHU_STROKE_OUTLINES).toHaveLength(KAISHU_STROKE_COUNT)
    expect(KAISHU_STROKE_SOURCE_PATHS).toHaveLength(12)
    expect(KAISHU_STROKE_CROPS).toHaveLength(KAISHU_STROKE_SOURCE_PATHS.length)
    expect(KAISHU_STROKE_OUTLINES.every((d) => /[Zz]$/.test(d))).toBe(true)
    expect(
      KAISHU_STROKE_OUTLINES.every(
        (d, index) => d === KAISHU_STROKE_SOURCE_PATHS[index % KAISHU_STROKE_SOURCE_PATHS.length]
      )
    ).toBe(true)
    expect(KAISHU_STROKE_CROPS.every((crop) => crop.width > 0 && crop.height > 0)).toBe(true)
  })

  it('gives the compact dot contour extra surrounding space', () => {
    const markup = renderToStaticMarkup(
      <svg viewBox="0 0 1000 1000">
        <KaishuStrokePaths layerClassNames={['far', 'mid', 'near']} />
      </svg>
    )

    expect(KAISHU_DOT_LOCAL_SCALE).toBe(0.42)
    expect(markup).toContain('height="34.44"')
    expect(markup).toContain('width="31.92"')
  })

  it('serializes the cached placements into a full-canvas alpha mask', () => {
    const placements = createKaishuStrokePlacements(() => 0.5)
    const markup = serializeKaishuStrokeMaskSvg(1200, 800, placements, 1.5)

    expect(markup).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(markup).toContain('width="1200" height="800"')
    expect(markup).toContain('viewBox="0 0 1000 1000"')
    expect(markup).toContain('preserveAspectRatio="xMidYMid slice"')
    expect((markup.match(/<path\b/g) ?? [])).toHaveLength(KAISHU_STROKE_COUNT)
    const pathDs = [...markup.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map((match) => match[1])
    expect([...new Set(pathDs)]).toEqual([...KAISHU_STROKE_SOURCE_PATHS])
    expect((markup.match(/stroke="#fff"/g) ?? [])).toHaveLength(KAISHU_STROKE_COUNT)
    expect((markup.match(/stroke-width="[^"]+"/g) ?? [])).toHaveLength(KAISHU_STROKE_COUNT)
    expect((markup.match(/opacity="[^"]+"/g) ?? [])).toHaveLength(KAISHU_STROKE_COUNT)
    expect(markup).toContain(`opacity="${(placements[0].opacity * KAISHU_DEPTH_OPACITIES[0]).toFixed(3)}"`)
    expect(markup).toContain(`opacity="${(placements[19].opacity * KAISHU_DEPTH_OPACITIES[1]).toFixed(3)}"`)
    expect(markup).toContain(`opacity="${(placements[38].opacity * KAISHU_DEPTH_OPACITIES[2]).toFixed(3)}"`)
    expect((markup.match(/vector-effect="non-scaling-stroke"/g) ?? [])).toHaveLength(KAISHU_STROKE_COUNT)
    expect((markup.match(/transform="translate\([^)]*\) rotate\(/g) ?? [])).toHaveLength(KAISHU_STROKE_COUNT)
    expect(markup).toContain('scale(.1 -.1)')
    expect(markup).toContain('width="31.92" height="34.44"')
    expect(markup).not.toMatch(/<text\b|font-family|font-size/i)
  })
})

describe('Kaishu stroke layout placement bounds', () => {
  it('proves non-overlap for every rotation, jitter, parallax, stroke, and scale outcome', () => {
    const angle = (KAISHU_ROTATION_MAX_DEGREES * Math.PI) / 180
    const cosine = Math.abs(Math.cos(angle))
    const sine = Math.abs(Math.sin(angle))
    const rotatedWidth = KAISHU_SCALE_MAX * (KAISHU_MAX_LOCAL_WIDTH * cosine + KAISHU_MAX_LOCAL_HEIGHT * sine)
    const rotatedHeight = KAISHU_SCALE_MAX * (KAISHU_MAX_LOCAL_WIDTH * sine + KAISHU_MAX_LOCAL_HEIGHT * cosine)
    const opposingJitter = KAISHU_JITTER_MAX * 2
    const fullStrokeWidth = KAISHU_MAX_STROKE_WIDTH

    expect(rotatedWidth + opposingJitter + KAISHU_MAX_RELATIVE_PARALLAX_X + fullStrokeWidth).toBeLessThan(
      KAISHU_CELL_PITCH
    )
    expect(rotatedHeight + opposingJitter + KAISHU_MAX_RELATIVE_PARALLAX_Y + fullStrokeWidth).toBeLessThan(
      KAISHU_CELL_PITCH
    )
  })

  it('uses every grid slot once and stays within deterministic bounds', () => {
    const placements = createKaishuStrokePlacements(() => 0.5)
    const slots = placements.map((placement) => placement.slotIndex)

    expect(placements).toHaveLength(KAISHU_STROKE_COUNT)
    expect(new Set(slots).size).toBe(KAISHU_STROKE_COUNT)

    for (const placement of placements) {
      const row = Math.floor(placement.slotIndex / KAISHU_GRID_SIZE)
      const column = placement.slotIndex % KAISHU_GRID_SIZE
      const centerX = (column + 0.5) * KAISHU_CELL_PITCH
      const centerY = (row + 0.5) * KAISHU_CELL_PITCH

      expect(Math.abs(placement.translateX - centerX)).toBeLessThanOrEqual(KAISHU_JITTER_MAX)
      expect(Math.abs(placement.translateY - centerY)).toBeLessThanOrEqual(KAISHU_JITTER_MAX)
      expect(Math.abs(placement.rotation)).toBeLessThanOrEqual(KAISHU_ROTATION_MAX_DEGREES)
      expect(placement.scale).toBeGreaterThanOrEqual(KAISHU_SCALE_MIN)
      expect(placement.scale).toBeLessThanOrEqual(KAISHU_SCALE_MAX)
      expect(placement.strokeWidth).toBeGreaterThanOrEqual(0.8)
      expect(placement.strokeWidth).toBeLessThanOrEqual(KAISHU_MAX_STROKE_WIDTH)
    }
  })

  it('clamps malformed random values and caches the document-lifetime result', () => {
    let calls = 0
    const malformedRandom = () => {
      calls += 1
      return calls % 3 === 0 ? 2 : calls % 3 === 1 ? Number.NaN : -1
    }
    const placements = createKaishuStrokePlacements(malformedRandom)

    expect(placements).toHaveLength(KAISHU_STROKE_COUNT)
    expect(placements.every((placement) => Number.isFinite(placement.translateX))).toBe(true)
    expect(placements.every((placement) => placement.scale >= KAISHU_SCALE_MIN && placement.scale <= KAISHU_SCALE_MAX)).toBe(true)

    const first = getKaishuStrokePlacements()
    const second = getKaishuStrokePlacements()
    expect(second).toBe(first)
    expect(second).toEqual(first)
  })
})
