import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const materialNames = [
  'character-ascii',
  'blockify',
  'crosshatch',
  'dithering',
  'dots',
  'edge-detection',
  'halftone',
  'matrix-rain',
  'noise-field',
  'threshold',
  'vhs',
  'voronoi',
  'wave-lines',
]

describe('shared Grain ownership', () => {
  it('keeps grain uniforms and code out of every dedicated material', async () => {
    for (const name of materialNames) {
      const source = await readFile(join(process.cwd(), 'components', 'studio', `${name}-material.ts`), 'utf8')

      expect(source, name).not.toMatch(/u_grain(?:Intensity|Size|Speed)/)
      expect(source, name).not.toContain('u_grainIntensity')
    }
  })

  it('retains Matrix Rain glyph randomness independently of shared Grain', async () => {
    const source = await readFile(join(process.cwd(), 'components', 'studio', 'matrix-rain-material.ts'), 'utf8')

    expect(source).toContain('matrixHash11')
    expect(source).toContain('matrixHash21')
    expect(source).toContain('matrixRainIntensity')
    expect(source).toContain('backgroundRainOpacity')
    expect(source).toContain('u_backgroundOpacity')
  })

  it('keeps ASCII local grain while removing its inline shared Grain pass', async () => {
    const source = await readFile(join(process.cwd(), 'components', 'studio', 'character-ascii-material.ts'), 'utf8')

    expect(source).toContain('* u_grain;')
    expect(source).not.toContain('float grainAmount = u_postB')
  })
})
