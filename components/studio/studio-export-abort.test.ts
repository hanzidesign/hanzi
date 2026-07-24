import { describe, expect, it } from 'vitest'

import { isAbortError } from '@/utils/dataUrl'

describe('Studio export abort detection', () => {
  it.each([
    new DOMException('Export canceled', 'AbortError'),
    Object.assign(new Error('Export canceled'), { name: 'AbortError' }),
  ])('recognizes %s as an abort error', (error) => {
    expect(isAbortError(error)).toBe(true)
  })
})
