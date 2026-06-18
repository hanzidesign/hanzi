import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const studioDir = join(process.cwd(), 'components/studio')

describe('Phase 5C active preview contract', () => {
  it('routes StudioCanvas through CharacterAsciiCanvas without the old square preview', async () => {
    const source = await readFile(join(studioDir, 'StudioCanvas.tsx'), 'utf8')

    expect(source).toContain('CharacterAsciiCanvas')
    expect(source).toContain('onAsciiStatusChange')
    expect(source).not.toContain('CharacterSurfaceCanvas')
    expect(source).not.toContain('AspectRatio')
    expect(source).not.toContain('ShaderCanvas')
    expect(source).not.toContain('character-mesh-status')
    expect(source).not.toContain('meshStatus')
  })

  it('keeps CharacterSurfaceCanvas decoupled from the old mesh and displacement preview path', async () => {
    const source = await readFile(
      join(studioDir, 'CharacterSurfaceCanvas.tsx'),
      'utf8',
    )
    const materialSource = await readFile(
      join(studioDir, 'surface-shader-material.ts'),
      'utf8',
    )

    expect(source).not.toContain('CharacterMesh')
    expect(source).not.toContain('OrbitControls')
    expect(source).not.toContain('useDisplacementTexture')
    expect(source).toContain('createCharacterSurfaceMaterial')
    expect(source).toContain('usePatternLayerTextures')
    expect(source).toContain('surfaceShaders.background.color')
    expect(materialSource).toContain('u_characterMask')
  })
})
