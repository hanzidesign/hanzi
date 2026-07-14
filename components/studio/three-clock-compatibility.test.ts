import { afterEach, describe, expect, it, vi } from 'vitest'
import { Clock } from 'three'

describe('React Three Fiber clock compatibility', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps the renderer clock constructor free of deprecation warnings', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    new Clock()

    expect(warn).not.toHaveBeenCalled()
  })
})
