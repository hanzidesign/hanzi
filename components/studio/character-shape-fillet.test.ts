import { Path, Shape } from 'three'
import { describe, expect, it } from 'vitest'

import {
  resizeCharacterShapes,
  smoothCharacterShapes,
  unionCharacterShapes,
} from './character-shape-fillet'

function rectangle(width = 100, height = 100) {
  const shape = new Shape()
  shape.moveTo(0, 0)
  shape.lineTo(width, 0)
  shape.lineTo(width, height)
  shape.lineTo(0, height)
  shape.closePath()
  return shape
}

function offsetRectangle(x: number, y: number, width = 100, height = 100) {
  const shape = new Shape()
  shape.moveTo(x, y)
  shape.lineTo(x + width, y)
  shape.lineTo(x + width, y + height)
  shape.lineTo(x, y + height)
  shape.closePath()
  return shape
}

function lShape() {
  const shape = new Shape()
  shape.moveTo(0, 0)
  shape.lineTo(100, 0)
  shape.lineTo(100, 30)
  shape.lineTo(30, 30)
  shape.lineTo(30, 100)
  shape.lineTo(0, 100)
  shape.closePath()
  return shape
}

function bounds(shape: Shape) {
  const points = shape.extractPoints(12).shape
  return {
    minX: Math.min(...points.map((point) => point.x)),
    maxX: Math.max(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxY: Math.max(...points.map((point) => point.y)),
  }
}

function materialArea(shape: Shape) {
  const points = shape.extractPoints(12)
  const signedArea = (ring: Array<{ x: number; y: number }>) => ring.reduce((sum, point, index) => {
    const next = ring[(index + 1) % ring.length]
    return sum + point.x * next.y - next.x * point.y
  }, 0) / 2
  return Math.abs(signedArea(points.shape)) - points.holes.reduce((sum, hole) => sum + Math.abs(signedArea(hole)), 0)
}

describe('character shape fillet', () => {
  it('unions overlapping Shapes with NonZero winding while preserving holes', () => {
    const first = rectangle(100, 100)
    const second = offsetRectangle(50, 0)
    const hole = new Path()
    hole.moveTo(10, 30)
    hole.lineTo(10, 70)
    hole.lineTo(40, 70)
    hole.lineTo(40, 30)
    hole.closePath()
    first.holes.push(hole)

    const union = unionCharacterShapes([first, second])

    expect(union).toHaveLength(1)
    expect(union[0].holes).toHaveLength(1)
    expect(bounds(union[0])).toEqual({ minX: 0, maxX: 150, minY: 0, maxY: 100 })
  })

  it('expands positive source offsets and shrinks negative offsets', () => {
    const source = [rectangle()]
    const expanded = resizeCharacterShapes(source, 10)
    const shrunk = resizeCharacterShapes(source, -10)

    expect(expanded.appliedSourceOffset).toBe(10)
    expect(shrunk.appliedSourceOffset).toBe(-10)
    expect(bounds(expanded.shapes[0]).minX).toBeLessThan(0)
    expect(bounds(expanded.shapes[0]).maxX).toBeGreaterThan(100)
    expect(bounds(shrunk.shapes[0]).minX).toBeGreaterThan(0)
    expect(bounds(shrunk.shapes[0]).maxX).toBeLessThan(100)
    expect(materialArea(shrunk.shapes[0])).toBeLessThan(materialArea(source[0]))
  })

  it('moves compound outer and hole contours in the same material direction', () => {
    const source = rectangle(120, 120)
    const hole = new Path()
    hole.moveTo(35, 35)
    hole.lineTo(35, 85)
    hole.lineTo(85, 85)
    hole.lineTo(85, 35)
    hole.closePath()
    source.holes.push(hole)

    const expanded = resizeCharacterShapes([source], 8).shapes[0]
    const shrunk = resizeCharacterShapes([source], -8).shapes[0]
    const holeSpan = (shape: Shape) => {
      const holePoints = shape.holes[0].getPoints(12)
      return Math.max(...holePoints.map((point) => point.x)) - Math.min(...holePoints.map((point) => point.x))
    }

    expect(bounds(expanded).minX).toBeLessThan(0)
    expect(bounds(expanded).maxX).toBeGreaterThan(120)
    expect(bounds(shrunk).minX).toBeGreaterThan(0)
    expect(bounds(shrunk).maxX).toBeLessThan(120)
    expect(holeSpan(expanded)).toBeLessThan(50)
    expect(holeSpan(shrunk)).toBeGreaterThan(50)
  })

  it('never reverse-expands a collapsing negative source offset', () => {
    const offsets = [0, -10, -20, -30, -40]
    const results = offsets.map((offset) => resizeCharacterShapes([rectangle()], offset))
    const areas = results.map((result) => materialArea(result.shapes[0]))
    const spans = results.map((result) => {
      const resultBounds = bounds(result.shapes[0])
      return Math.max(resultBounds.maxX - resultBounds.minX, resultBounds.maxY - resultBounds.minY)
    })

    for (let index = 1; index < offsets.length; index += 1) {
      expect(areas[index]).toBeLessThanOrEqual(areas[index - 1] + 1e-5)
      expect(spans[index]).toBeLessThanOrEqual(spans[index - 1] + 1e-5)
    }
    expect(results.at(-1)!.shapes.length).toBeGreaterThan(0)
    expect(results.at(-1)!.appliedSourceOffset).toBeLessThan(0)
    expect(areas.at(-1)!).toBeGreaterThan(0)
  })

  it('selects the largest renderable lattice level before a thin stroke collapses', () => {
    const stroke = rectangle(100, 2)
    const result = resizeCharacterShapes([stroke], -1)
    const resultBounds = bounds(result.shapes[0])

    expect(result.appliedSourceOffset).toBeLessThan(0)
    expect(result.appliedSourceOffset).toBeGreaterThan(-1)
    expect(resultBounds.maxY - resultBounds.minY).toBeGreaterThan(0)
    expect(resultBounds.maxY - resultBounds.minY).toBeLessThan(2)
  })

  it('leaves the original Shapes untouched when the radius is zero', () => {
    const source = [rectangle()]

    const result = smoothCharacterShapes(source, 0)

    expect(result.shapes).toBe(source)
    expect(result.appliedSourceRadius).toBe(0)
  })

  it('leaves the original Shapes untouched when the source offset is zero', () => {
    const source = [rectangle()]

    const result = resizeCharacterShapes(source, 0)

    expect(result.shapes).toBe(source)
    expect(result.appliedSourceOffset).toBe(0)
  })

  it('rounds a rectangle inward without expanding its bounds', () => {
    const result = smoothCharacterShapes([rectangle()], 10)
    const points = result.shapes[0].extractPoints(12).shape

    expect(result.appliedSourceRadius).toBeGreaterThan(9)
    expect(points.length).toBeGreaterThan(8)
    expect(bounds(result.shapes[0])).toEqual({ minX: 0, maxX: 100, minY: 0, maxY: 100 })
    expect(points.some((point) => point.x === 0 && point.y === 0)).toBe(false)
  })

  it('rounds both the outer corners and the reflex corner of an L shape', () => {
    const result = smoothCharacterShapes([lShape()], 8)
    const points = result.shapes[0].extractPoints(12).shape

    expect(result.appliedSourceRadius).toBeGreaterThan(7)
    expect(bounds(result.shapes[0])).toEqual({ minX: 0, maxX: 100, minY: 0, maxY: 100 })
    expect(points.some((point) => point.x === 0 && point.y === 0)).toBe(false)
    expect(points.some((point) => point.x === 30 && point.y === 30)).toBe(false)
    expect(points.some((point) => point.x > 30 && point.y > 30)).toBe(true)
    expect(points.some((point) => point.x < 30 && point.y > 30)).toBe(true)
    expect(points.some((point) => point.x > 30 && point.y < 30)).toBe(true)
  })

  it('preserves holes while applying one shared safe radius', () => {
    const shape = rectangle(120, 120)
    const hole = new Path()
    hole.moveTo(35, 35)
    hole.lineTo(35, 85)
    hole.lineTo(85, 85)
    hole.lineTo(85, 35)
    hole.closePath()
    shape.holes.push(hole)

    const result = smoothCharacterShapes([shape], 12)

    expect(result.appliedSourceRadius).toBeGreaterThan(0)
    expect(result.shapes).toHaveLength(1)
    expect(result.shapes[0].holes).toHaveLength(1)
    expect(bounds(result.shapes[0])).toEqual({ minX: 0, maxX: 120, minY: 0, maxY: 120 })
    const holePoints = result.shapes[0].holes[0].getPoints(12)
    expect(Math.max(...holePoints.map((point) => point.x)) - Math.min(...holePoints.map((point) => point.x))).toBeGreaterThanOrEqual(25)
    expect(Math.max(...holePoints.map((point) => point.y)) - Math.min(...holePoints.map((point) => point.y))).toBeGreaterThanOrEqual(25)
  })

  it('clamps a shared radius before a skinny component or hole disappears', () => {
    const outer = rectangle(100, 18)
    const second = new Shape()
    second.moveTo(120, 0)
    second.lineTo(132, 0)
    second.lineTo(132, 12)
    second.lineTo(120, 12)
    second.closePath()

    const result = smoothCharacterShapes([outer, second], 30)
    const muchLargerRequest = smoothCharacterShapes([outer, second], 3000)

    expect(result.appliedSourceRadius).toBeGreaterThan(0)
    expect(result.appliedSourceRadius).toBeLessThan(30)
    expect(result.shapes).toHaveLength(2)
    expect(muchLargerRequest.appliedSourceRadius).toBeGreaterThan(0)
    expect(muchLargerRequest.appliedSourceRadius).toBe(result.appliedSourceRadius)
    expect(muchLargerRequest.shapes).toHaveLength(2)
  })

  it('keeps a nonzero safe fillet when a tiny component shares a large canvas', () => {
    const large = rectangle(1000, 1000)
    const tiny = new Shape()
    tiny.moveTo(1200, 0)
    tiny.lineTo(1200.5, 0)
    tiny.lineTo(1200.5, 0.5)
    tiny.lineTo(1200, 0.5)
    tiny.closePath()

    const result = smoothCharacterShapes([large, tiny], 150)

    expect(result.appliedSourceRadius).toBeGreaterThan(0)
    expect(result.appliedSourceRadius).toBeLessThan(0.25)
    expect(result.shapes).toHaveLength(2)
  })

  it('accepts acute, obtuse, and sampled curve contours without invalid points', () => {
    const angled = new Shape()
    angled.moveTo(0, 0)
    angled.lineTo(100, 0)
    angled.lineTo(75, 45)
    angled.lineTo(45, 100)
    angled.lineTo(0, 70)
    angled.closePath()

    const curved = new Shape()
    curved.moveTo(0, 0)
    curved.bezierCurveTo(20, -10, 80, -10, 100, 0)
    curved.lineTo(80, 60)
    curved.bezierCurveTo(55, 80, 20, 70, 0, 40)
    curved.closePath()

    for (const shape of [angled, curved]) {
      const result = smoothCharacterShapes([shape], 6)
      expect(result.appliedSourceRadius).toBeGreaterThan(0)
      for (const point of result.shapes[0].extractPoints(12).shape) {
        expect(Number.isFinite(point.x)).toBe(true)
        expect(Number.isFinite(point.y)).toBe(true)
      }
    }
  })
})
