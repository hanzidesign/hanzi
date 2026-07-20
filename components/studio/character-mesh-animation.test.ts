import { readFile } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'

describe('character mesh GPU animation seam', () => {
  it('updates bindings at priority -2 from the shared effective time', async () => {
    const source = await readFile(
      new URL('./character-mesh-animation.ts', import.meta.url),
      'utf8',
    )

    expect(source).toContain('computeEffectiveAnimationTime')
    expect(source).toContain('binding?.update(')
    expect(source).toContain('playing: animation.playing')
    expect(source).toContain('}, -2)')
    expect(source).not.toContain('skipNextPreviewFrame')
  })
})
