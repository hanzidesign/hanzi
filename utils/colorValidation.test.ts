import { describe, expect, it } from 'vitest'

import { isSixDigitHexColor } from './colorValidation'

describe('isSixDigitHexColor', () => {
  it.each(['#123456', '#ABCDEF'])('accepts six-digit hex colors (%s)', (value) => {
    expect(isSixDigitHexColor(value)).toBe(true)
  })

  it.each(['#12345', '#1234567', '#12345g', '123456', '#12345678'])('rejects malformed, shorthand, and alpha values (%s)', (value) => {
    expect(isSixDigitHexColor(value)).toBe(false)
  })

  it.each([undefined, null, 123456, {}, ['#123456']])('rejects non-string values (%s)', (value) => {
    expect(isSixDigitHexColor(value)).toBe(false)
  })
})
