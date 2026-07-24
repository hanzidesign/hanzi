import { describe, expect, it } from 'vitest'

import {
  readStudioBoolean,
  readStudioEnum,
  readStudioNumber,
  readStudioString,
} from './studio-control-readers'

describe('Studio control readers', () => {
  it('reads only finite numbers without coercion', () => {
    expect(readStudioNumber(undefined, 7)).toBe(7)
    expect(readStudioNumber('7', 7)).toBe(7)
    expect(readStudioNumber(NaN, 7)).toBe(7)
    expect(readStudioNumber(Infinity, 7)).toBe(7)
    expect(readStudioNumber(-Infinity, 7)).toBe(7)
    expect(readStudioNumber(3.5, 7)).toBe(3.5)
  })

  it('reads strings including the empty string without coercion', () => {
    expect(readStudioString(undefined, 'fallback')).toBe('fallback')
    expect(readStudioString(7, 'fallback')).toBe('fallback')
    expect(readStudioString(false, 'fallback')).toBe('fallback')
    expect(readStudioString('', 'fallback')).toBe('')
    expect(readStudioString('value', 'fallback')).toBe('value')
  })

  it('maps only exact true to one', () => {
    expect(readStudioBoolean(undefined)).toBe(0)
    expect(readStudioBoolean(false)).toBe(0)
    expect(readStudioBoolean(1)).toBe(0)
    expect(readStudioBoolean('true')).toBe(0)
    expect(readStudioBoolean(true)).toBe(1)
  })

  it('looks up string keys with existing in semantics and falls back when missing', () => {
    const values = { original: 0, mono: 1 }
    expect(readStudioEnum(undefined, values, 'mono')).toBe(1)
    expect(readStudioEnum(1, values, 'mono')).toBe(1)
    expect(readStudioEnum('', values, 'mono')).toBe(1)
    expect(readStudioEnum('original', values, 'mono')).toBe(0)
    expect(readStudioEnum('missing', values, 'mono')).toBe(1)

    const inherited = Object.create({ inherited: 2 }) as Record<string, number>
    inherited.own = 3
    expect(readStudioEnum('inherited', inherited, 'own')).toBe(2)
  })
})
