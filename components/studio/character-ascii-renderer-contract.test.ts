import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const studioDir = join(process.cwd(), 'components', 'studio')

describe('Phase 5C active 3D ASCII renderer contract', () => {
  it('routes the active center canvas through CharacterAsciiCanvas', async () => {
    const studioCanvasSource = await readFile(join(studioDir, 'StudioCanvas.tsx'), 'utf8')

    expect(studioCanvasSource).toContain('CharacterAsciiCanvas')
    expect(studioCanvasSource).toContain('onAsciiStatusChange')
    expect(studioCanvasSource).not.toContain('CharacterSurfaceCanvas')
  })

  it('builds a true SVG mesh and auto-spins it on the Y axis', async () => {
    const rendererSource = await readFile(join(studioDir, 'CharacterAsciiCanvas.tsx'), 'utf8')

    expect(rendererSource).toContain('SVGLoader')
    expect(rendererSource).toContain('createCharacterMeshGeometries')
    expect(rendererSource).toContain('createAsciiShaderMaterial')
    expect(rendererSource).toContain('groupRef.current.rotation.y')
    expect(rendererSource).toContain('mesh.autoRotate')
    expect(rendererSource).toContain('mesh.autoRotateSpeed')
    expect(rendererSource).toContain('readAnimationTime()')
    expect(rendererSource).toContain('u_asciiCellSize')
  })

  it('uses only the ASCII effect bucket and never compiles another Effect', async () => {
    const rendererSource = await readFile(join(studioDir, 'CharacterAsciiCanvas.tsx'), 'utf8')

    expect(rendererSource).toContain('grainradEffect')
    expect(rendererSource).toContain('compileGrainradEffectRuntime')
    expect(rendererSource).toContain("selectedEffectId: 'ascii'")
    expect(rendererSource).toContain('grainradEffect.controls.ascii')
    expect(rendererSource).not.toContain('grainradEffect.selectedEffectId')
    expect(rendererSource).not.toContain('grainradEffect.controls[grainradEffect.selectedEffectId]')
    expect(rendererSource).toContain('grainradRuntime')
    expect(rendererSource).toContain('applyGrainradRuntimeUniforms')
  })
})
