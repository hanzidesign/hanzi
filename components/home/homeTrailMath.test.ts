import { describe, expect, it } from 'vitest'

import {
  TRAIL_DIRECTION_DEADZONE,
  decodeTrailDirection,
  encodeTrailDirection,
  retainTrailMagnitude,
} from './homeTrailMath'

describe('home trail direction math', () => {
  it('cancels opposite directions instead of forcing a unit vector', () => {
    const mixed = encodeTrailDirection({ x: 1 - 1, y: 0 })

    expect(decodeTrailDirection(...mixed)).toEqual({ x: 0, y: 0 })
  })

  it('preserves sub-unit magnitude through encode and decode', () => {
    const encoded = encodeTrailDirection({ x: 0.4, y: -0.3 })
    const decoded = decodeTrailDirection(...encoded)

    expect(decoded.x).toBeCloseTo(0.4)
    expect(decoded.y).toBeCloseTo(-0.3)
  })

  it('caps vectors outside the unit circle before encoding', () => {
    const encoded = encodeTrailDirection({ x: 3, y: 4 })
    const decoded = decodeTrailDirection(...encoded)

    expect(decoded.x).toBeCloseTo(0.6)
    expect(decoded.y).toBeCloseTo(0.8)
    expect(Math.hypot(decoded.x, decoded.y)).toBeCloseTo(1)
  })

  it('zeroes vectors inside the signed RG deadzone', () => {
    const encoded = encodeTrailDirection({ x: TRAIL_DIRECTION_DEADZONE / 4, y: 0 })

    expect(decodeTrailDirection(...encoded)).toEqual({ x: 0, y: 0 })
  })

  it('retains e^-1 and e^-2 of direction magnitude after one and two seconds', () => {
    expect(retainTrailMagnitude(1, 1)).toBeCloseTo(Math.exp(-1))
    expect(retainTrailMagnitude(1, 2)).toBeCloseTo(Math.exp(-2))
  })
})
